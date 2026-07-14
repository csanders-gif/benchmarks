var DATA=null;
var DATA_URL="https://cdn.jsdelivr.net/gh/csanders-gif/benchmarks/report_data.json";
var PAT_NAMES=['Self-Sufficient','Agency-Dependent','Burning Staff','Dual Pressure'];

var DOWNLOAD_BTN='<button class="rg-download" onclick="window.print()" aria-label="Download this report as PDF">'+
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'+
  'Download PDF</button>';
var PAT_WHY=[
 ['Lower labor costs','Minimal agency reliance','Stable staffing','Stronger quality outcomes'],
 ['Controlled overtime','Structural agency reliance','Continuity risk from rotating staff','Higher labor cost'],
 ['High overtime','Permanent staff absorbing strain','Rising turnover risk','Elevated burnout risk'],
 ['High overtime','High agency use','Workforce under pressure on two fronts','Elevated cost and turnover']];
var TIER_NAMES=['Opportunity','Meets target','High performance'];
var TIER_ICON=['\uD83D\uDD34','\uD83D\uDFE1','\u2705'];

var NAT={ot:8.9,ag:5.7,hp:3.86,rn:0.66,to:46.6,re:23.9,fa:3.18};

function tierFor(k,v){
  if(v==null)return null;
  switch(k){
    case 'ot':return v<3?2:(v<=7.5?1:0);
    case 'ag':return v<1?2:(v<5?1:0);
    case 'to':return v<40?2:(v<50?1:0);
    case 'hp':return v>=4.5?2:(v>=3.75?1:0);
    case 'rn':return v>=0.80?2:(v>=0.65?1:0);
  }
  return null;
}
var TARGETS={ot:'3 – 7.5%',ag:'< 5%',to:'< 50%',hp:'3.75 – 4.5 hrs',rn:'0.65 – 0.80 hrs'};
var BENCH=[['hp','Adjusted total HPRD','',2],['rn','Adjusted RN HPRD','',2],['ot','Overtime %','%',1],['ag','Agency / contract %','%',1],['to','Total nurse turnover','%',1]];

// savings model: mirrors the OT widget + report float-pool business case
var REG_WAGE=25,OT_MULT=1.5,AGENCY_DIFF=15,HPRD_C=3.86;
var OT_PREMIUM=REG_WAGE*(OT_MULT-1);
var OT_TIERS=[[10.6,100,9.3],[8.1,10.6,7.0],[5.8,8.1,4.3]];
function otSavings(ot,cen){
  var q=null;for(var i=0;i<OT_TIERS.length;i++){if(ot>OT_TIERS[i][0]&&ot<=OT_TIERS[i][1]){q=OT_TIERS[i];break;}}
  if(!q)return {total:0,target:null};
  var tot=cen*HPRD_C*7;
  var target=q[2], saved=tot*(ot/100)-tot*(target/100);
  if(saved<=0)return {total:0,target:target};
  var avoid=saved*0.30, shift=saved*0.70;
  var total=shift*52*OT_PREMIUM + avoid*52*(REG_WAGE*OT_MULT);
  return {total:Math.round(total),target:target};
}
function agSavings(ag,cen){
  if(ag<=5)return 0;
  var excess=(ag-5)/100, hrs=cen*HPRD_C*7*excess;
  return Math.round(hrs*52*AGENCY_DIFF);
}
function money(n){return '$'+Math.round(n).toLocaleString();}

function pct(v){return (v==null)?'–':v.toFixed(v>=10?1:(v<1?2:1));}
function esc(s){return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function qparam(k){return new URLSearchParams(window.location.search).get(k);}
function fmt(v,u,d){return (v==null)?'–':v.toFixed(d)+u;}
function relPct(you,nat){ if(you==null||nat==null||nat===0)return null; return Math.round(Math.abs(you-nat)/nat*100); }

// Build the list of "strengths" that are actually true & favorable
function buildStrengths(e){
  var s=[];
  if(e.ot!=null && e.ot<NAT.ot){var r=relPct(e.ot,NAT.ot); s.push(r+'% less overtime than average');}
  if(e.ag!=null && e.ag<1) s.push('Near-zero agency use');
  else if(e.ag!=null && e.ag<NAT.ag){var r2=relPct(e.ag,NAT.ag); s.push(r2+'% less agency use than average');}
  if(tierFor('rn',e.rn)===2) s.push('RN staffing exceeds the high-performance target');
  else if(e.rn!=null && e.rn>NAT.rn) s.push('RN staffing above average');
  if(e.re!=null && e.re<NAT.re){var r3=relPct(e.re,NAT.re); s.push('Rehospitalization '+r3+'% below average');}
  if(e.fa!=null && e.fa<NAT.fa){var r4=relPct(e.fa,NAT.fa); s.push('Falls with major injury '+r4+'% below average');}
  if(e.to!=null && e.to<NAT.to){var r5=relPct(e.to,NAT.to); s.push('Turnover '+r5+'% below average');}
  return s;
}

// Auto-pick three KPI cards: most notable metrics (favorable first, else gaps)
function buildKPIs(e){
  var cards=[];
  // candidate list with computed "notability"
  var cand=[];
  if(e.ot!=null){var d=NAT.ot-e.ot; cand.push({good:d>0,mag:Math.abs(d),v:relPct(e.ot,NAT.ot)+'%',l:(d>0?'less':'more')+' overtime'});}
  if(e.ag!=null){var da=NAT.ag-e.ag; if(e.ag<0.05)cards.push({good:true,v:'0%',l:'agency utilization'}); else cand.push({good:da>0,mag:Math.abs(da),v:relPct(e.ag,NAT.ag)+'%',l:(da>0?'less':'more')+' agency use'});}
  if(e.re!=null){var dr=NAT.re-e.re; cand.push({good:dr>0,mag:Math.abs(dr),v:Math.abs(dr).toFixed(1),l:(dr>0?'fewer':'more')+' rehospitalizations per 100 residents'});}
  if(e.rn!=null){var dn=e.rn-NAT.rn; cand.push({good:dn>0,mag:Math.abs(dn)*10,v:relPct(e.rn,NAT.rn)+'%',l:(dn>0?'higher':'lower')+' RN staffing'});}
  if(e.to!=null){var dt=NAT.to-e.to; cand.push({good:dt>0,mag:Math.abs(dt),v:relPct(e.to,NAT.to)+'%',l:(dt>0?'lower':'higher')+' turnover'});}
  if(e.fa!=null){var df=NAT.fa-e.fa; cand.push({good:df>0,mag:Math.abs(df)*10,v:relPct(e.fa,NAT.fa)+'%',l:(df>0?'fewer':'more')+' falls with major injury'});}
  cand.sort(function(a,b){return b.mag-a.mag;});
  for(var i=0;i<cand.length && cards.length<3;i++) cards.push(cand[i]);
  return cards.slice(0,3);
}

// Biggest opportunity = metric with lowest tier / largest gap below target
function biggestOpportunity(e){
  var worst=null;
  BENCH.forEach(function(m){
    var k=m[0],t=tierFor(k,e[k]); if(t==null)return;
    if(worst==null||t<worst.t) worst={k:k,label:m[1],t:t,v:e[k]};
  });
  if(!worst)return 'Continue monitoring your staffing metrics to maintain performance.';
  if(worst.t===2) return 'You are already operating in the high-performance range across the board. The next opportunity is sustaining it by using census-based scheduling to hold overtime and agency low as demand fluctuates.';
  var msgs={
    ot:'Overtime is running above the operational target. Reducing it toward the benchmark range is the fastest lever to cut cost and ease turnover pressure.',
    ag:'Agency use is above the 5% operational ceiling. Shifting recurring agency shifts into an internal float pool would lower cost and improve continuity of care.',
    to:'Turnover is above the operational target. Stabilizing scheduling and reducing overtime strain are the most direct ways to bring it down.',
    hp:'Adjusted HPRD is below the operational target. Increasing base staffing toward the target range is associated with better quality outcomes and lower turnover.',
    rn:'RN staffing is below the evidence-based clinical floor. Increasing RN coverage is the single staffing change most associated with lower rehospitalization.'
  };
  if(worst.t===1 && (worst.k==='hp'||worst.k==='rn'))
    return 'Your staffing is within the target range. Increasing '+worst.label.toLowerCase()+' toward the high-performance range may further improve quality outcomes.';
  return msgs[worst.k]||'Focus on bringing '+worst.label.toLowerCase()+' into the operational target range.';
}

function buildRecs(e,pat){
  var r=[];
  if(e.ot!=null && e.ot>7.5) r.push('Reduce overtime toward the 7.5% target using projected-overtime reports.');
  else r.push('Keep overtime below the 7.5% benchmark.');
  if(e.ag!=null && e.ag>=5) r.push('Shift recurring agency shifts into an internal float pool to bring agency under 5%.');
  else r.push('Keep agency use below the 5% target.');
  if(tierFor('rn',e.rn)===0) r.push('Increase RN coverage toward the 0.65 HPRD clinical floor.');
  else r.push('Review RN coverage during peak census periods.');
  r.push('Monitor PPD weekly as census changes.');
  return r.slice(0,4);
}

function summaryLine(e,name){
  var better=0,worse=0;
  [['ot',1],['ag',1],['to',1],['re',1],['fa',1],['rn',-1],['hp',-1]].forEach(function(p){
    var k=p[0],dir=p[1],v=e[k],n=NAT[k]; if(v==null)return;
    var b = dir>0 ? v<n : v>n; if(Math.abs(v-n)<(k==='hp'||k==='rn'?0.03:0.15))return;
    if(b)better++;else worse++;
  });
  if(better>=5) return name+' is performing above national staffing averages.';
  if(better>worse) return name+' is operating above national averages on most measures.';
  if(worse>better) return name+' has opportunities to improve staffing performance.';
  return name+' is performing near national averages, with room to improve.';
}

function delta(you,b,lb,d){
  if(you==null||b==null)return '<span class="rg-delta d-neutral">–</span>';
  var diff=you-b, better=lb?diff<0:diff>0, near=Math.abs(diff)<(d===2?0.03:0.15);
  var cls=near?'d-neutral':(better?'d-better':'d-worse');
  return '<span class="rg-delta '+cls+'">'+(diff>0?'+':'')+diff.toFixed(d)+'</span>';
}

function insightCards(e){
  var items=[
    ['ot','Overtime','%',1,true],['ag','Agency','%',1,true],['rn','RN HPRD','',2,false]
  ];
  return '<div class="rg-insights">'+items.map(function(m){
    var k=m[0],you=e[k],n=NAT[k],lb=m[4],r=relPct(you,n);
    var better = lb ? you<n : you>n;
    var arrow = you<n?'\u2193':'\u2191';
    var dcls = better?'down':'worse';
    var rel = (r==null)?'':(r+'% '+(you<n?'lower':'higher'));
    return '<div class="rg-ins"><div class="m">'+m[1]+'</div><div class="v">'+fmt(you,m[2],m[3])+'</div>'+
      '<div class="b">National: '+fmt(n,m[2],m[3])+'</div>'+
      '<div class="d '+dcls+'">'+arrow+' '+rel+'</div></div>';
  }).join('')+'</div>';
}

function scoreTable(e){
  var rows=BENCH.map(function(m){
    var k=m[0],you=e[k],t=tierFor(k,you);
    var cell = t==null?'–':'<span class="s'+t+'">'+TIER_ICON[t]+' '+TIER_NAMES[t]+'</span>';
    return '<tr><td>'+m[1]+'</td><td>'+fmt(you,m[2],m[3])+'</td><td class="s'+(t==null?'':t)+'">'+cell+'</td></tr>';
  }).join('');
  return '<table class="rg-score"><thead><tr><th>Metric</th><th>Your value</th><th>Assessment</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function cmpTable(e,b,label){
  var M=[['ot','Overtime %','ot',true,'%',1],['ag','Agency %','ag',true,'%',1],['hp','Adjusted total HPRD','hp',false,'',2],['rn','Adjusted RN HPRD','rn',false,'',2],['to','Nurse turnover','to',true,'%',1],['re','Rehospitalization','re',true,'%',1],['fa','Falls w/ major injury','fa',true,'%',2]];
  var rows=M.map(function(m){
    var you=e[m[0]], bv=b?b[m[2]]:null;
    return '<tr><td>'+m[1]+'</td><td class="rg-you">'+fmt(you,m[4],m[5])+'</td><td>'+fmt(bv,m[4],m[5])+delta(you,bv,m[3],m[5])+'</td></tr>';
  }).join('');
  return '<table class="rg-cmp"><thead><tr><th>Metric</th><th>You</th><th>'+label+' (Δ)</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function savingsBlock(e){
  var ot, ag;
  if(e.ot_sav!=null || e.ag_sav!=null){        // chain: use precomputed portfolio sums
    ot={total:e.ot_sav||0}; ag=e.ag_sav||0;
  } else {                                      // facility: compute from its census
    var cen=e.cen||87.5;
    ot=otSavings(e.ot!=null?e.ot:0,cen); ag=agSavings(e.ag!=null?e.ag:0,cen);
  }
  var total=ot.total+ag;
  if(total<=0) return '';  // nothing to save, omit the section entirely
  var isChain = (e.ot_sav!=null || e.ag_sav!=null);
  var boxes='';
  if(ot.total>0) boxes+='<div class="rg-sbox"><div class="l">Overtime reduction</div><div class="v">'+money(ot.total)+'</div></div>';
  if(ag>0)       boxes+='<div class="rg-sbox"><div class="l">Agency reduction</div><div class="v">'+money(ag)+'</div></div>';
  if(ot.total>0 && ag>0) boxes+='<div class="rg-sbox total"><div class="l">Total estimated</div><div class="v">'+money(total)+'</div></div>';
  var lever = (ot.total>0 && ag>0) ? 'overtime and agency' : (ot.total>0 ? 'overtime' : 'agency');
  var sh = isChain
    ? 'Across this operator\u2019s facilities, reducing '+lever+' toward benchmark targets could recover roughly '+money(total)+' per year portfolio-wide.'
    : 'For a facility of your size, reducing '+lever+' toward benchmark targets could recover roughly '+money(total)+' per year.';
  var note = isChain
    ? 'Portfolio estimate sums the modeled savings of each facility, using each facility\u2019s average daily census and benchmark wage assumptions ($'+REG_WAGE+'/hr base, 1.5\u00d7 overtime, $'+AGENCY_DIFF+'/hr agency-to-float differential). Actual savings depend on wage rates and current utilization.'
    : 'Estimate uses this facility\u2019s average daily census (~'+(e.cen||88)+' residents) and benchmark wage assumptions ($'+REG_WAGE+'/hr base, 1.5\u00d7 overtime, $'+AGENCY_DIFF+'/hr agency-to-float differential); actual savings depend on wage rates and current utilization. Overtime savings assume reduction to the next-lower quartile average; agency savings assume reduction to the 5% ceiling.';
  return '<div class="rg-section"><div class="rg-h">Potential annual savings</div>'+
    '<div class="rg-hsub">Estimated savings from bringing '+lever+' toward benchmark targets.</div>'+
    '<div class="rg-savings"><div class="se">Estimated annual savings</div>'+
    '<div class="sh">'+sh+'</div>'+
    '<div class="rg-savings-grid">'+boxes+'</div>'+
    '<div class="note">'+note+'</div>'+
    '</div></div>';
}

function statePatCls(pat){var i=PAT_NAMES.indexOf(pat);return i>=0?'pat'+i:'patmix';}
function stateBlurb(st,pat){
  if(pat==='Split') return esc(st)+' has a wide performance spread, with facilities clustering into both high-performing and high-risk staffing models. Comparing against both the state average and national benchmarks gives the most complete picture.';
  if(pat==='Mixed') return esc(st)+' has no dominant staffing pattern. Facilities are spread across all four models, so the statewide average blends very different operations. Use it as directional context alongside the national benchmark.';
  return DATA.statePatternDefs && DATA.statePatternDefs[pat] ? DATA.statePatternDefs[pat] : '';
}

function show(h){var el=document.getElementById('covr-report'); if(el) el.innerHTML=h;}
function covrBlock(){
  return '<div class="rg-covr"><div class="h">How Covr helps</div>'+
    '<div class="p">Covr helps operators monitor overtime, agency use, staffing levels, and PPD in real time, making it easier to stay within benchmark targets before labor issues affect cost or quality.</div>'+
    '<a class="rg-cta" href="https://www.covr.care/contact">Schedule a demo</a></div>';
}
function foot(){
  return '<div class="rg-foot">Benchmark targets from the Covr SNF Staffing Benchmarks report. Source: CMS PBJ Q2–Q4 2025 (overtime, agency); CMS Provider Info &amp; MDS Quality Measures May 2026. SNF-only; CCRCs excluded; n = 13,098. National averages: overtime 8.9%, agency 5.7%, adjusted HPRD 3.86, RN HPRD 0.66, turnover 46.6%, rehospitalization 23.9%, falls 3.18%. Savings figures are modeled estimates, not a quote.</div>';
}

function renderFacility(f){
  var p=f.p, st=f.s, sObj=DATA.states[st], rnFlag=sObj&&sObj.rn_flag;
  var strengths=buildStrengths(f), kpis=buildKPIs(f);
  var h='<div class="rg-topbar"><div class="rg-eyebrow">Your SNF Benchmark Report</div>'+DOWNLOAD_BTN+'</div>';
  h+='<div class="rg-summary">'+esc(summaryLine(f,f.n))+'</div>';
  h+='<div class="rg-idmeta">'+esc((f.ct?f.ct+', ':'')+st)+(f.b?' · '+f.b+' beds':'')+'</div>';
  h+='<div class="rg-badges"><span class="rg-pat-badge pat'+p+'">'+PAT_NAMES[p]+'</span>'+(rnFlag?'<span class="rg-rnflag">'+st+' RN\u2713 state</span>':'')+'</div>';
  // KPI cards
  h+='<div class="rg-kpis">'+kpis.map(function(k){return '<div class="rg-kpi '+(k.good?'good':'bad')+'"><div class="v">'+k.v+'</div><div class="l">'+k.l+'</div></div>';}).join('')+'</div>';
  // Key strengths
  if(strengths.length){
    h+='<div class="rg-section"><div class="rg-h">What\u2019s going well</div>'+
      strengths.slice(0,5).map(function(s){return '<div class="rg-strength"><span class="ic">\u2713</span><span>'+s+'</span></div>';}).join('')+'</div>';
  }
  // Why this matters (pattern)
  h+='<div class="rg-section"><div class="rg-h">Why this matters</div>'+
    '<div class="rg-why">'+PAT_NAMES[p]+' facilities typically have:<ul>'+
    PAT_WHY[p].map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div></div>';
  // Scorecard
  h+='<div class="rg-section"><div class="rg-h">Performance against benchmark targets</div>'+
    '<div class="rg-hsub">Your staffing metrics against the operational targets from the report.</div>'+
    scoreTable(f)+'</div>';
  // Insights (national)
  h+='<div class="rg-section"><div class="rg-h">How you compare nationwide</div>'+
    '<div class="rg-hsub">Your results against national SNF averages.</div>'+
    insightCards(f)+'</div>';
  // Savings
  h+=savingsBlock(f);
  // Biggest opportunity
  h+='<div class="rg-section"><div class="rg-h">Biggest opportunity</div><div class="rg-opp">'+biggestOpportunity(f)+'</div></div>';
  // Recommendations
  h+='<div class="rg-section"><div class="rg-h">Recommended next steps</div><ol class="rg-recs">'+
    buildRecs(f,p).map(function(r,i){return '<li><span class="n">'+(i+1)+'</span><span>'+r+'</span></li>';}).join('')+'</ol></div>';
  // State
  if(sObj){
    h+='<hr class="rg-hr"><div class="rg-section"><div class="rg-h">How you compare in '+esc(st)+'</div>'+
      '<div class="rg-hsub">Additional context: how you compare with facilities under similar labor markets, reimbursement models, and staffing conditions.</div>'+
      '<div class="rg-stateprofile"><div class="sp-top"><span class="sp-name">'+esc(st)+'</span>'+
      '<span class="rg-pat-badge '+statePatCls(sObj.pattern)+'">'+sObj.pattern+'</span>'+
      (sObj.rn_flag?'<span class="rg-rnflag">RN\u2713 state</span>':'')+'</div>'+stateBlurb(st,sObj.pattern)+'</div>'+
      cmpTable(f,sObj,st)+'</div>';
  }
  h+=covrBlock()+foot();
  show(h);
}

function renderChain(c){
  var mix=c.mix;
  var strengths=buildStrengths(c), kpis=buildKPIs(c);
  var h='<div class="rg-topbar"><div class="rg-eyebrow">Your SNF Benchmark Report</div>'+DOWNLOAD_BTN+'</div>';
  h+='<div class="rg-summary">'+esc(summaryLine(c,c.name))+'</div>';
  h+='<div class="rg-idmeta">'+c.n+' SNFs across '+c.states.length+' state'+(c.states.length>1?'s':'')+'</div>';
  h+='<div class="rg-kpis">'+kpis.map(function(k){return '<div class="rg-kpi '+(k.good?'good':'bad')+'"><div class="v">'+k.v+'</div><div class="l">'+k.l+'</div></div>';}).join('')+'</div>';
  // facility mix (no single operator label; the mix tells the story)
  h+='<div class="rg-section"><div class="rg-h">Facility mix</div><div class="rg-hsub">How this operator\u2019s '+c.n+' facilities distribute across the four labor patterns.</div>'+
    '<div class="rg-mixcard"><div class="rg-mixbar">'+mix.map(function(pc,i){return pc>0?'<div class="rg-mixseg p'+i+'" style="width:'+pc+'%"></div>':'';}).join('')+'</div>'+
    '<div class="rg-mixlegend">'+mix.map(function(pc,i){return '<div class="rg-mixleg"><span class="rg-mixdot" style="background:var(--'+['self','agency','burn','dual'][i]+')"></span>'+PAT_NAMES[i]+' <b>'+pc+'%</b></div>';}).join('')+'</div></div></div>';
  if(strengths.length){
    h+='<div class="rg-section"><div class="rg-h">What\u2019s going well</div>'+strengths.slice(0,5).map(function(s){return '<div class="rg-strength"><span class="ic">\u2713</span><span>'+s+'</span></div>';}).join('')+'</div>';
  }
  h+='<div class="rg-section"><div class="rg-h">Performance against benchmark targets</div><div class="rg-hsub">Portfolio averages against the operational targets from the report.</div>'+scoreTable(c)+'</div>';
  h+='<div class="rg-section"><div class="rg-h">How the portfolio compares nationwide</div><div class="rg-hsub">Portfolio averages against national SNF averages.</div>'+insightCards(c)+'</div>';
  h+=savingsBlock(c);
  h+='<div class="rg-section"><div class="rg-h">Biggest opportunity</div><div class="rg-opp">'+biggestOpportunity(c)+'</div></div>';
  h+='<div class="rg-section"><div class="rg-h">Recommended next steps</div><ol class="rg-recs">'+buildRecs(c,0).map(function(r,i){return '<li><span class="n">'+(i+1)+'</span><span>'+r+'</span></li>';}).join('')+'</ol></div>';
  h+='<div class="rg-foot" style="border:none;padding-top:0">Portfolio figures are facility-level averages across the operator\u2019s SNFs. State comparison is available in single-facility mode.</div>';
  h+=covrBlock()+foot();
  show(h);
}

function resolve(){
  var q=(qparam('company')||'').trim();
  if(!q){show('<div class="rg-msg">No company was provided. Please return to the form and select your facility or operator.</div>');return;}
  var ql=q.toLowerCase();
  for(var cid in DATA.chainRollups){if(DATA.chainRollups[cid].name.toLowerCase()===ql){renderChain(DATA.chainRollups[cid]);return;}}
  var fx=DATA.facilities.filter(function(f){return f.n.toLowerCase()===ql;});
  if(fx.length===1){renderFacility(fx[0]);return;}
  if(fx.length>1){chooser(fx.map(function(f){return {t:'f',o:f,n:f.n,m:(f.ct?f.ct+', ':'')+f.s};}),q);return;}
  var cand=[];
  for(var cid2 in DATA.chainRollups){var c=DATA.chainRollups[cid2];if(c.name.toLowerCase().indexOf(ql)>-1)cand.push({t:'c',o:c,n:c.name,m:c.n+' facilities'});if(cand.length>=8)break;}
  for(var i=0;i<DATA.facilities.length&&cand.length<8;i++){var f=DATA.facilities[i];if(f.n.toLowerCase().indexOf(ql)>-1)cand.push({t:'f',o:f,n:f.n,m:(f.ct?f.ct+', ':'')+f.s});}
  if(cand.length){chooser(cand,q);}
  else{show('<div class="rg-msg">We couldn\u2019t find <strong>'+esc(q)+'</strong> in the CMS dataset. It may be listed under a different operating name. <a class="rg-cta" href="javascript:history.back()">Try again</a></div>');}
}
function chooser(items,q){
  window.__items=items;
  var h='<div class="rg-eyebrow">Your SNF Benchmark Report</div><div class="rg-msg">We found more than one match for <strong>'+esc(q)+'</strong>. Which one is yours?</div><div class="rg-choices">';
  h+=items.map(function(it,i){return '<button class="rg-choice" onclick="__pick('+i+')"><div class="n">'+esc(it.n)+(it.t==="c"?" (operator)":"")+'</div><div class="m">'+esc(it.m)+'</div></button>';}).join('');
  h+='</div>';show(h);
}
window.__pick=function(i){var it=window.__items[i];if(it.t==='c')renderChain(it.o);else renderFacility(it.o);};


function __boot(){
  if(!document.getElementById("covr-report")) return;
  fetch(DATA_URL).then(function(r){return r.json();}).then(function(d){DATA=d; resolve();})
  .catch(function(){var el=document.getElementById("covr-report"); if(el) el.innerHTML='<div class="rg-msg">We couldn\u2019t load the benchmark data right now. Please refresh, or contact us if the problem continues.</div>';});
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",__boot);}else{__boot();}
