"use client";
import { useState } from 'react';
import { historySelection, priceChartGeometry, defaultHistoricalProduct } from '@/lib/price-history';
type R = Record<string, any>;
const colors=['#267553','#b07832','#5578ab','#9862a3','#ba655d'];
const number=(value:number)=>new Intl.NumberFormat('en-LK',{maximumFractionDigits:1}).format(value);
export default function AdminPriceChart({rows}:{rows:R[]}) {
  const products=[...new Set(rows.map(r=>String(r.product)))].sort();
  const [product,setProduct]=useState(()=>products.includes(defaultHistoricalProduct(rows,'Carrot'))?defaultHistoricalProduct(rows,'Carrot'):products[0]||''),[market,setMarket]=useState('all'),[point,setPoint]=useState<R|null>(null);
  const markets=[...new Set(rows.filter(r=>r.product===product).map(r=>String(r.claimedMarket)))].sort();
  const selection=historySelection(rows,product,market), chart=priceChartGeometry(selection.usable);
  const excluded=selection.records.length-selection.usable.length;
  const date=(ms:number)=>new Date(ms).toISOString().slice(0,10);
  return <section className="panel admin-price-panel">
    <div className="admin-section-head"><div><p className="admin-eyebrow">MARKET HISTORY</p><h2>Price variation over time</h2><p className="admin-muted">See how recorded prices rise and fall for one product. Select a point for its original price range.</p></div><span className="admin-badge">Historical · unverified</span></div>
    <div className="admin-price-controls"><label className="field"><span>Chart product</span><select value={product} onChange={e=>{setProduct(e.target.value);setMarket('all');setPoint(null);}}>{products.map(p=><option key={p}>{p}</option>)}</select></label><label className="field"><span>Chart market</span><select value={market} onChange={e=>{setMarket(e.target.value);setPoint(null);}}><option value="all">All recorded markets</option>{markets.map(m=><option key={m}>{m}</option>)}</select></label></div>
    <div className="admin-price-facts"><div><small>Usable observations</small><strong>{selection.usable.length}</strong></div><div><small>Observed lower–upper range</small><strong>{chart?`${number(Math.min(...selection.usable.map(r=>r.lower)))}–${number(Math.max(...selection.usable.map(r=>r.upper)))}`:'Unavailable'} <small>{chart?'LKR/kg':''}</small></strong></div><div><small>Excluded from chart</small><strong>{excluded}</strong></div></div>
    {chart?<><p className="admin-chart-swipe">Swipe the chart horizontally to see all dates.</p><div className="admin-price-scroll"><svg className="admin-price-svg" viewBox="0 0 880 260" role="group" aria-label={`Historical price variation for ${product}, ${market==='all'?'all recorded markets':market}. Lines show range midpoints in LKR per kilogram.`}>
      <text x="65" y="19" className="admin-axis-title">LKR/kg · midpoint of original range</text>
      {[0,1,2,3,4].map(i=>{const value=chart.low+(chart.high-chart.low)*i/4;return <g key={i}><line x1="65" x2="815" y1={chart.y(value)} y2={chart.y(value)} stroke="#e5ebe6" strokeDasharray="4 5"/><text x="55" y={chart.y(value)+4} textAnchor="end">{number(value)}</text></g>;})}
      {[...new Set([chart.first,chart.first+(chart.last-chart.first)/2,chart.last])].map(ms=><text key={ms} x={chart.last===chart.first?440:65+(ms-chart.first)/(chart.last-chart.first)*750} y="219" textAnchor="middle">{date(ms)}</text>)}
      {chart.series.map((series,index)=><g key={series.label}>
        {series.points.length>1&&<polyline className="admin-price-line" fill="none" stroke={colors[index%colors.length]} strokeWidth="3" strokeLinejoin="round" points={series.points.map(r=>`${chart.x(r)},${chart.y((r.lower+r.upper)/2)}`).join(' ')}/>}
        {series.points.map(r=><g key={r.id}><line x1={chart.x(r)} x2={chart.x(r)} y1={chart.y(r.lower)} y2={chart.y(r.upper)} stroke={colors[index%colors.length]} strokeWidth="2" opacity="0.24"/><circle role="button" tabIndex={0} aria-label={`${r.date}, ${series.label}, midpoint ${number((r.lower+r.upper)/2)} LKR/kg; original range ${r.lower} to ${r.upper}`} cx={chart.x(r)} cy={chart.y((r.lower+r.upper)/2)} r={point?.id===r.id?7:5} fill={colors[index%colors.length]} stroke="white" strokeWidth="2" onMouseEnter={()=>setPoint(r)} onFocus={()=>setPoint(r)} onClick={()=>setPoint(r)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setPoint(r);}}}><title>{`${r.date} · ${series.label}: ${r.lower}–${r.upper} LKR/kg`}</title></circle></g>)}
      </g>)}
    </svg></div><div className="admin-price-legend">{chart.series.map((series,index)=><span key={series.label}><i style={{background:colors[index%colors.length]}}/>{series.label}</span>)}</div>
    <div className="admin-point-detail" role="status">{point?<><strong>{point.date} · {point.claimedMarket}</strong><span>{point.originalLabel}</span><span>Original range: <b>{number(point.lower)}–{number(point.upper)} LKR/kg</b> · Midpoint: <b>{number((point.lower+point.upper)/2)} LKR/kg</b></span></>:<span>Hover, tap or keyboard-focus a point to inspect its price. Vertical marks show the original lower–upper range.</span>}</div>
    </>:null}
    {selection.reason&&<p className="admin-chart-note">{selection.reason}</p>}
    <p className="admin-muted">Lines connect available observations within the same original product label and market. Gaps do not mean zero. Missing, incomplete, reversed and uncertain-market records are excluded. These historical prices are unverified; they are not live prices or a forecast.</p>
  </section>;
}
