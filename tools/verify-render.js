const {launch,newTab,sleep}=require('./cdp');
(async()=>{const b=await launch(9450);try{const t=await newTab(b,'http://localhost:8795/',932,430,2);await sleep(1200);
console.log(await t.eval(`(()=>{UI.buildCards(()=>{});for(const id of ROSTER)for(const pose of Art.POSES)Art.frame(id,pose);for(const arena of ARENA_LIST){Game.startLocal('orochi','gashadokuro','hard',arena);Render.draw(Game.st,{controls:true},.016);}return 'All sprite poses, cards and arenas rendered';})()`));
await t.shot(__dirname+'/shots/roster-arena.png');console.log(t.logs.filter(x=>/EXCEPTION/.test(x)));t.close();}finally{b.kill();}process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
