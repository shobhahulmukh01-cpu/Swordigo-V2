#!/usr/bin/env python3
"""EMBRWAKE browser smoke: native keyboard/touch + real Canvas, no game-state cheats.
Python stdlib + a local Chromium executable; no npm or Playwright required.
Run: python3 tests/browser-smoke.py --root dist --output qa/browser
Optional --base-url checks a running production server instead of a test server.
This suite is not a full playthrough, cross-browser, physical-controller or accessibility certification.
"""
import argparse,base64,functools,http.server,json,os,shutil,socket,struct,subprocess,threading,time,urllib.request,urllib.parse,mimetypes,selectors
from pathlib import Path

class WebSocket:
    def __init__(self,url):
        from urllib.parse import urlsplit
        u=urlsplit(url);self.s=socket.create_connection((u.hostname,u.port),10);self.s.settimeout(10);self.buf=b''
        key=base64.b64encode(os.urandom(16)).decode()
        req=f'GET {u.path} HTTP/1.1\r\nHost: {u.hostname}:{u.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\nOrigin: http://127.0.0.1\r\n\r\n'
        self.s.sendall(req.encode());data=b''
        while b'\r\n\r\n' not in data:data+=self.s.recv(4096)
        head,self.buf=data.split(b'\r\n\r\n',1)
        if b' 101 ' not in head:raise RuntimeError('WebSocket upgrade failed: '+head.decode(errors='replace'))
    def exact(self,n):
        while len(self.buf)<n:
            b=self.s.recv(max(4096,n-len(self.buf)))
            if not b:raise RuntimeError('Browser protocol socket closed')
            self.buf+=b
        b,self.buf=self.buf[:n],self.buf[n:];return b
    def send(self,text,opcode=1):
        b=text.encode() if isinstance(text,str) else text;n=len(b);mask=os.urandom(4)
        h=bytes([0x80|opcode,0x80|n]) if n<126 else bytes([0x80|opcode,0x80|126])+struct.pack('!H',n) if n<65536 else bytes([0x80|opcode,0x80|127])+struct.pack('!Q',n)
        self.s.sendall(h+mask+bytes(v^mask[i%4] for i,v in enumerate(b)))
    def receive(self):
        parts=[]
        while True:
            a,b=self.exact(2);op=a&15;n=b&127
            if n==126:n=struct.unpack('!H',self.exact(2))[0]
            if n==127:n=struct.unpack('!Q',self.exact(8))[0]
            mask=self.exact(4) if b&128 else None;p=self.exact(n)
            if mask:p=bytes(v^mask[i%4] for i,v in enumerate(p))
            if op==8:raise RuntimeError('Browser closed protocol connection')
            if op==9:self.send(p,10);continue
            if op==10:continue
            parts.append(p)
            if a&128:return json.loads(b''.join(parts))

class PipeTransport:
    def __init__(self,process):
        self.process=process;self.buf=b'';self.s=self;self.selector=selectors.DefaultSelector();self.selector.register(process.stdout,selectors.EVENT_READ)
    def send(self,text):
        self.process.stdin.write(text.encode()+b'\n');self.process.stdin.flush()
    def receive(self):
        while b'\n' not in self.buf:
            if not self.selector.select(15):raise RuntimeError('Timed out waiting for Chromium CDP pipe')
            b=os.read(self.process.stdout.fileno(),65536)
            if not b:raise RuntimeError('Chromium CDP bridge exited')
            self.buf+=b
        line,self.buf=self.buf.split(b'\n',1);return json.loads(line)
    def close(self):
        self.selector.close();self.process.stdin.close()

class CDP:
    def __init__(self,transport,file_root=None):
        self.ws=transport;self.seq=0;self.events=[];self.exceptions=[];self.failures=[];self.session=None;self.file_root=file_root;self.ignore=set();self.fulfilled=[]
    def envelope(self,ident,method,params):
        r={'id':ident,'method':method,'params':params}
        if self.session and not method.startswith(('Browser.','Target.')):r['sessionId']=self.session
        return r
    def fulfill(self,p):
        url=p['request']['url'];name=urllib.parse.unquote(urllib.parse.urlsplit(url).path).lstrip('/') or 'index.html';path=(self.file_root/name).resolve();code=404;body=b''
        if path.is_relative_to(self.file_root) and path.is_file():code=200;body=path.read_bytes()
        mime=mimetypes.guess_type(name)[0] or 'application/octet-stream';self.seq+=1;ident=self.seq;self.ignore.add(ident)
        params={'requestId':p['requestId'],'responseCode':code,'responseHeaders':[{'name':'Content-Type','value':mime},{'name':'Cache-Control','value':'no-store'}],'body':base64.b64encode(body).decode()}
        self.ws.send(json.dumps(self.envelope(ident,'Fetch.fulfillRequest',params)));self.fulfilled.append({'path':name,'status':code})
    def call(self,method,params=None):
        self.seq+=1;ident=self.seq;self.ws.send(json.dumps(self.envelope(ident,method,params or {})))
        while True:
            r=self.ws.receive()
            if r.get('method')=='Fetch.requestPaused' and self.file_root:self.fulfill(r['params'])
            if r.get('id') in self.ignore:
                self.ignore.remove(r['id'])
                if 'error' in r:raise RuntimeError('Local asset fulfillment failed: '+json.dumps(r['error']))
                continue
            if r.get('method')=='Runtime.exceptionThrown':self.exceptions.append(r['params'])
            if r.get('method')=='Network.responseReceived':
                p=r['params']['response']
                if p.get('status',0)>=400 and '/assets/' in p.get('url',''):self.failures.append({'url':p['url'],'status':p['status']})
            if r.get('id')==ident:
                if 'error' in r:raise RuntimeError(method+': '+json.dumps(r['error']))
                return r.get('result',{})
            self.events.append(r)
    def evaluate(self,expr):
        r=self.call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':True})
        if 'exceptionDetails' in r:raise RuntimeError('Evaluation failed: '+json.dumps(r['exceptionDetails']))
        return r.get('result',{}).get('value')
    def wait(self,expr,timeout=8):
        end=time.monotonic()+timeout
        while time.monotonic()<end:
            if self.evaluate(expr):return
            time.sleep(.05)
        raise AssertionError('Timed out: '+expr)
    def key(self,code,down=True,key=None,shift=False):
        k=key or {'Space':' ','Escape':'Escape','Tab':'Tab','ShiftLeft':'Shift'}.get(code,code[3:].lower() if code.startswith('Key') else code)
        self.call('Input.dispatchKeyEvent',{'type':'keyDown' if down else 'keyUp','code':code,'key':k,'modifiers':8 if shift else 0})
    def tap(self,code,key=None):self.key(code,True,key);time.sleep(.06);self.key(code,False,key);time.sleep(.06)
    def click(self,selector):
        p=self.evaluate("(()=>{const e=document.querySelector("+json.dumps(selector)+");if(!e)throw Error('Missing button');e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,w:r.width,h:r.height,disabled:e.disabled,hit:!!hit&&(hit===e||e.contains(hit))};})()")
        if p['disabled'] or p['w']<=0 or p['h']<=0 or not p['hit']:raise AssertionError('Button not actionable at its native hit target: '+selector)
        self.call('Input.dispatchMouseEvent',{'type':'mousePressed','button':'left','clickCount':1,'x':p['x'],'y':p['y']})
        self.call('Input.dispatchMouseEvent',{'type':'mouseReleased','button':'left','clickCount':1,'x':p['x'],'y':p['y']});time.sleep(.09)
    def screenshot(self,path):
        data=self.call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})['data'];Path(path).write_bytes(base64.b64decode(data))

def run(args):
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True);work=Path('scratch')/('browser-'+str(time.time_ns()));work.mkdir(parents=True,exist_ok=True)
    binary=shutil.which(os.environ.get('CHROME_BIN','')) or shutil.which(os.environ.get('CHROME_PATH','')) or shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome') or shutil.which('google-chrome-stable')
    if not binary:raise RuntimeError('Chromium executable is required')
    server=None
    base=args.base_url.rstrip('/')+'/' if args.base_url else 'http://emberwake.test/'
    local_root=None if args.base_url else Path(args.root).resolve()
    if local_root and not (local_root/'index.html').is_file():raise RuntimeError('Export root does not contain index.html')
    bridge=Path(__file__).with_name('cdp-pipe.cjs')
    if not bridge.is_file():raise RuntimeError('cdp-pipe.cjs must be alongside browser-smoke.py')
    profile=work/'profile';profile.mkdir(exist_ok=True)
    log=(work/'chromium.log').open('wb');cmd=['node',str(bridge),binary,'--headless=new','--disable-dev-shm-usage','--disable-background-networking','--user-data-dir='+str(profile.resolve()),'about:blank']
    if args.no_sandbox:cmd.insert(4,'--no-sandbox')
    chrome=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log);results=[];c=None
    def check(name,value,detail=None):
        record={'name':name,'passed':bool(value)}
        if detail is not None:record['detail']=detail
        results.append(record)
        if not value:raise AssertionError(name+': '+repr(detail))
    try:
        c=CDP(PipeTransport(chrome),local_root)
        target=c.call('Target.createTarget',{'url':'about:blank'})['targetId']
        c.session=c.call('Target.attachToTarget',{'targetId':target,'flatten':True})['sessionId']
        c.call('Page.enable');c.call('Runtime.enable');c.call('Network.enable')
        if local_root:c.call('Fetch.enable',{'patterns':[{'urlPattern':base+'*','requestStage':'Request'}]})
        c.call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':980,'deviceScaleFactor':1,'mobile':False})
        downloads=work/'downloads';downloads.mkdir(exist_ok=True)
        c.call('Browser.setDownloadBehavior',{'behavior':'allow','downloadPath':str(downloads.resolve())})
        c.call('Page.navigate',{'url':base});c.wait('Boolean(window.emberwake&&window.EW_V11)')
        c.wait('window.emberwake.renderer.realmImages&&window.emberwake.renderer.realmImages.every(i=>i.complete&&i.naturalWidth>0)')
        check('desktop boot with all three realm artworks',c.evaluate("!document.getElementById('fatal').hidden===false && !document.getElementById('title-screen').hidden"))
        check('boot is idempotent',c.evaluate('EWClient.boot()===window.emberwake'))
        c.screenshot(out/'desktop-title.png')
        c.click('[data-act="new"]');check('difficulty selection dialog',c.evaluate("emberwake.modalKind==='new'"))
        c.click('[data-diff="story"]');c.click('[data-act="launch"]');check('story intro opens',c.evaluate("emberwake.game.progress.difficulty==='story'&&emberwake.modalKind==='dialogue'"))
        c.click('#modal-content [data-act="close"]');check('story simulation resumes',c.evaluate("emberwake.game.status==='playing'&&!emberwake.paused"))
        if not c.evaluate('emberwake.settings.sound'):c.click('.topactions [data-act="mute"]')
        c.tap('KeyD');check('Web Audio unlocks after a real user gesture',c.evaluate("!!emberwake.audio.ctx&&emberwake.audio.ctx.state==='running'"))
        x=c.evaluate('emberwake.game.p.x');c.key('KeyD');time.sleep(.4);c.key('KeyD',False)
        check('real keyboard movement',c.evaluate('emberwake.game.p.x')>x+35)
        y=c.evaluate('emberwake.game.p.y');c.key('Space');time.sleep(.11);c.key('Space',False);time.sleep(.04);c.key('Space');time.sleep(.1);c.key('Space',False)
        check('real keyboard double jump',c.evaluate('emberwake.game.p.jumps')==2 and c.evaluate('emberwake.game.p.y')<y-30)
        time.sleep(1);c.tap('KeyQ');check('keyboard precision guard',c.evaluate('emberwake.game.p.parryCD')>0)
        c.tap('Escape');check('pause dialog',c.evaluate("emberwake.modalKind==='pause'&&emberwake.paused"));t=c.evaluate('emberwake.game.progress.stats.time');time.sleep(.3)
        check('pause freezes simulation',abs(c.evaluate('emberwake.game.progress.stats.time')-t)<.0001)
        c.click('#modal-content [data-act="map"]');check('map renders current realm',c.evaluate("emberwake.modalKind==='map'&&!!document.querySelector('.mapgraphic')"));c.click('#modal-content [data-act="close"]')
        c.tap('KeyI');check('journal includes local milestones',c.evaluate("document.getElementById('modal-content').textContent.includes('Courier milestones')"));c.tap('Escape')
        c.click('.topactions [data-act="settings"]');c.evaluate("document.getElementById('set-minimap').focus()");c.tap('Tab')
        check('settings inputs obey modal focus trap',c.evaluate("document.getElementById('modal').contains(document.activeElement)"))
        c.evaluate("document.getElementById('set-volume').focus()");c.tap('Escape');check('Escape closes settings while input focused',c.evaluate('emberwake.modalKind===null&&!emberwake.paused'))
        c.click('.topactions [data-act="settings"]');c.click('[data-act="bindings"]');c.click('[data-bind="parry"]');c.tap('KeyU')
        check('keyboard remap is persisted',c.evaluate("emberwake.bindings.parry==='KeyU'&&JSON.parse(localStorage.getItem('EW_BINDINGS_V1')).parry==='KeyU'"))
        c.click('#modal-content [data-act="close"]');time.sleep(.7);c.tap('KeyU');check('remapped guard works',c.evaluate('emberwake.game.p.parryCD')>0)
        c.tap('Escape');c.click('[data-act="export"]');end=time.monotonic()+5
        while not (downloads/'emberwake-journey.json').exists() and time.monotonic()<end:time.sleep(.05)
        savefile=downloads/'emberwake-journey.json';check('real save download completed',savefile.exists())
        save=json.loads(savefile.read_text());check('exported save validates',c.evaluate('EW.validateSave('+json.dumps(save)+',EW_LEVELS)!==null'))
        doc=c.call('DOM.getDocument');node=c.call('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':'#import-file'})['nodeId'];before=c.evaluate("localStorage.getItem('EW_STORY_V3')")
        c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(savefile.resolve())]});c.wait("emberwake.modalKind==='restore'")
        check('import requires confirmation',c.evaluate("emberwake.modalKind==='restore'&&emberwake.paused"));c.click('[data-act="import-cancel"]')
        check('import cancel leaves saved journey untouched',c.evaluate("localStorage.getItem('EW_STORY_V3')")==before)
        c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(savefile.resolve())]});c.wait("emberwake.modalKind==='restore'");c.click('[data-act="import-accept"]')
        c.wait("emberwake.game.status==='playing'&&emberwake.modalKind!=='restore'")
        check('accepted native file restore validates and resumes',c.evaluate("emberwake.game.progress.level==="+str(save['level'])+"&&EW.validateSave(localStorage.getItem('EW_STORY_V3'),EW_LEVELS)!==null&&!emberwake._importCandidate"))
        check('accept keeps a valid rolling story backup',c.evaluate("EW.validateSave(localStorage.getItem('EW_STORY_V3.backup'),EW_LEVELS)!==null"))
        if c.evaluate("emberwake.modalKind==='dialogue'"):c.click('#modal-content [data-act="close"]')
        c.tap('Escape');before_race=c.evaluate("localStorage.getItem('EW_STORY_V3')")
        c.evaluate("window.__nativeFileText=File.prototype.text;File.prototype.text=function(){const f=this;return new Promise(resolve=>{window.__finishImportRead=()=>__nativeFileText.call(f).then(resolve);});};true")
        c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(savefile.resolve())]});c.wait("typeof window.__finishImportRead==='function'")
        c.click('#modal-content [data-act="map"]');c.evaluate('window.__finishImportRead();true');time.sleep(.25)
        check('stale asynchronous file read cannot replace a newer modal',c.evaluate("emberwake.modalKind==='map'&&!emberwake._importCandidate&&localStorage.getItem('EW_STORY_V3')==="+json.dumps(before_race)))
        c.evaluate('File.prototype.text=window.__nativeFileText;delete window.__finishImportRead;true');c.click('#modal-content [data-act="close"]')
        c.tap('Escape');c.click('[data-act="title"]');before=c.evaluate("localStorage.getItem('EW_STORY_V3')");c.click('[data-act="new"]');c.click('[data-act="launch"]')
        check('new journey replacement requires confirmation',c.evaluate("emberwake.modalKind==='replace'"));c.click('[data-act="new-cancel"]')
        check('new journey cancel preserves save',c.evaluate("localStorage.getItem('EW_STORY_V3')")==before)
        c.click('[data-act="continue"]');check('continue restores playable journey',c.evaluate("emberwake.game.status==='playing'&&!emberwake.paused"))
        c.call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':2,'mobile':True});c.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});time.sleep(.15)
        if not c.evaluate("document.body.classList.contains('touch-on')"):
            c.click('.topactions [data-act="settings"]');c.click('[data-act="touch"]');c.click('#modal-content [data-act="close"]')
        check('portrait has no horizontal overflow',c.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
        check('all portrait touch buttons fit viewport',c.evaluate("Array.from(document.querySelectorAll('[data-touch]')).every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+1})"))
        points=c.evaluate("['right','jump'].map((k,i)=>{const r=document.querySelector('[data-touch='+k+']').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:i+1}})")
        x=c.evaluate('emberwake.game.p.x');y=c.evaluate('emberwake.game.p.y');c.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':points});time.sleep(.25)
        check('real multi-touch move and jump',c.evaluate('emberwake.game.p.x')>x+20 and c.evaluate('emberwake.game.p.y')<y-20)
        c.call('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});time.sleep(.1);check('touch release clears held state',c.evaluate('emberwake.held.size===0'))
        c.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[points[0]]});time.sleep(.05);c.call('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});time.sleep(.08)
        check('touch cancellation clears held state',c.evaluate('emberwake.held.size===0'));c.screenshot(out/'portrait-game.png')
        c.call('Emulation.setDeviceMetricsOverride',{'width':844,'height':390,'deviceScaleFactor':1,'mobile':True});time.sleep(.2)
        check('landscape has no horizontal overflow',c.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'));c.screenshot(out/'landscape-game.png')
        # A standards-shaped virtual controller exercises the actual poller; not a physical-device claim.
        c.wait('emberwake.game.p.parryCD===0')
        c.evaluate("window.__ewPad={id:'EMBRWAKE QA controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};__ewPad.buttons[6].value=.9;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__ewPad]});true")
        time.sleep(.2);check('analog trigger held at controller attachment is quarantined',c.evaluate('emberwake.game.p.parryCD===0'))
        c.evaluate('__ewPad.buttons[6].value=0;true');time.sleep(.15);c.evaluate('__ewPad.buttons[6].value=.9;true');time.sleep(.1)
        check('analog trigger guard works after neutral re-arm',c.evaluate('emberwake.game.p.parryCD>0'));c.evaluate('__ewPad.buttons[6].value=0;true');time.sleep(.1)
        def pad_press(index):
            c.evaluate('__ewPad.buttons['+str(index)+']={pressed:true,touched:true,value:1};true');time.sleep(.1)
            c.evaluate('__ewPad.buttons['+str(index)+']={pressed:false,touched:false,value:0};true');time.sleep(.1)
        pad_press(9);check('controller Start opens pause',c.evaluate("emberwake.modalKind==='pause'"))
        frozen=c.evaluate('emberwake.game.progress.stats.time');time.sleep(.2);check('controller pause freezes world',c.evaluate('emberwake.game.progress.stats.time')==frozen)
        first_focus=c.evaluate('document.activeElement.dataset.act');pad_press(13)
        check('controller D-pad moves modal focus',c.evaluate("document.getElementById('modal').contains(document.activeElement)&&document.activeElement.dataset.act!=="+json.dumps(first_focus)))
        for _ in range(20):
            if c.evaluate("document.activeElement.dataset.act==='map'"):break
            pad_press(13)
        check('controller can select the map action',c.evaluate("document.activeElement.dataset.act==='map'"));pad_press(0);c.wait("emberwake.modalKind==='map'")
        check('controller A activates focused modal action',c.evaluate("emberwake.modalKind==='map'"));pad_press(1)
        check('controller B returns from a soft modal',c.evaluate('emberwake.modalKind===null&&!emberwake.paused'))
        c.click('.topactions [data-act="settings"]');old_map=c.evaluate('emberwake.miniMap');c.click('#set-minimap')
        check('mini-map preference toggles and persists',c.evaluate("emberwake.miniMap!=="+str(old_map).lower()+"&&localStorage.getItem('EW_MINIMAP_V1')===String(emberwake.miniMap)"));c.click('#modal-content [data-act="close"]')
        proof_path=Path(args.completed_proof)
        if not proof_path.is_file():raise RuntimeError('Run the input-only campaign suite first; --completed-proof must contain its earned final save')
        proof=json.loads(proof_path.read_text());completed=next(r['final'] for r in proof['runs'] if r['pass'] and r['mode']=='story' and r['final']['completed'])
        completed_file=work/'earned-completed-journey.json';completed_file.write_text(json.dumps(completed))
        c.tap('Escape');doc=c.call('DOM.getDocument');node=c.call('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':'#import-file'})['nodeId'];c.call('DOM.setFileInputFiles',{'nodeId':node,'files':[str(completed_file.resolve())]});c.wait("emberwake.modalKind==='restore'");c.click('[data-act="import-accept"]');c.wait("emberwake.modalKind==='ending'")
        check('input-earned completed save restores the real ending UI',c.evaluate("emberwake.game.progress.completed&&emberwake.modalKind==='ending'&&emberwake.hard"))
        # Restoring/opening a modal quarantines any held input until it returns to neutral.
        time.sleep(.2);pad_press(1);check('controller B cannot dismiss a hard ending',c.evaluate("emberwake.modalKind==='ending'"))
        for _ in range(20):
            if c.evaluate("document.activeElement.dataset.act==='title'"):break
            pad_press(13)
        check('controller can select title from hard ending',c.evaluate("document.activeElement.dataset.act==='title'"));pad_press(0)
        check('controller A exits ending through the actual title action',c.evaluate("emberwake.game.status==='menu'"))
        for _ in range(24):
            if c.evaluate("document.activeElement.dataset.act==='rush'"):break
            pad_press(13)
        check('completed story unlocks controller-selectable gauntlet',c.evaluate("document.activeElement.dataset.act==='rush'&&!document.activeElement.disabled"));pad_press(0)
        check('controller launches the unlocked gauntlet',c.evaluate("emberwake.game.progress.mode==='rush'&&emberwake.game.status==='playing'"))
        c.call('Page.reload');c.wait('Boolean(window.emberwake&&window.EW_V11)')
        check('keyboard remap survives actual page reload',c.evaluate("emberwake.bindings.parry==='KeyU'"))
        check('mini-map preference survives actual page reload',c.evaluate("emberwake.miniMap===JSON.parse(localStorage.getItem('EW_MINIMAP_V1'))"))
        c.call('Page.addScriptToEvaluateOnNewDocument',{'source':"Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied for privacy test','SecurityError')}});"})
        c.call('Page.navigate',{'url':base});c.wait('Boolean(window.emberwake)');c.click('[data-act="new"]');c.click('[data-act="launch"]')
        check('privacy mode remains playable with denied storage',c.evaluate("emberwake.game.status==='playing'&&emberwake.storageWarned===true&&emberwake.storage===null"))
        check('no browser runtime exceptions',not c.exceptions,c.exceptions);check('no missing game asset responses',not c.failures,c.failures)
    except Exception as e:
        results.append({'name':'suite execution','passed':False,'error':str(e)})
        if c:
            try:c.screenshot(out/'failure.png')
            except Exception:pass
    finally:
        if c:
            try:c.ws.s.close()
            except OSError:pass
        chrome.terminate()
        try:chrome.wait(timeout=5)
        except subprocess.TimeoutExpired:chrome.kill();chrome.wait()
        log.close()
        if server:server.shutdown();server.server_close()
    report={'passed':sum(t['passed'] for t in results),'failed':sum(not t['passed'] for t in results),'checks':results,'browser':subprocess.check_output([binary,'--version'],text=True).strip(),'scope':'Actual Chromium DOM/Canvas, native keyboard/multi-touch/mouse, download/file input, Web Audio user-gesture activation, save confirmation/backup/async cancellation, earned ending restore and reload/privacy checks. Controller poller uses a standards-shaped synthetic navigator gamepad, not physical hardware. Assets served by CDP request fulfillment when --base-url is omitted. Not a public deployment, full browser campaign, cross-browser/device or accessibility certification.','browserSandbox':'explicit --no-sandbox in isolated test container' if args.no_sandbox else 'Chromium default sandbox','assetTransport':'local CDP Fetch fulfillment' if local_root else 'requested HTTP server','fulfilledAssets':c.fulfilled if c else [],'runtimeExceptions':c.exceptions if c else [],'missingAssets':c.failures if c else []}
    (out/'browser-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));return 0 if not report['failed'] else 1

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--no-sandbox',action='store_true',help='Opt-in only for an isolated test container without usable Chromium namespaces');p.add_argument('--completed-proof',default='qa/emberwake-input-proof.json');p.add_argument('--root',default='dist');p.add_argument('--base-url');p.add_argument('--output',default='qa/browser');a=p.parse_args();raise SystemExit(run(a))
