"use client";
import { Sprout, Receipt, MapPin, Tractor, ArrowUpRight } from 'lucide-react';
import { useLanguage } from './language';
type R=Record<string,any>;
export default function IndependentOverview({data,cultivations,onExpense,onLands,onCultivations}:{data:R;cultivations:R[];onExpense:()=>void;onLands:()=>void;onCultivations:()=>void}) {
  const {t}=useLanguage();
  if(data.user.account_type!=='independent')return null;
  const active=cultivations.filter(c=>c.status==='active').length,ids=new Set(cultivations.map(c=>c.id));
  const expenseCount=(data.entries||[]).filter((e:R)=>e.kind==='expense'&&!e.voided&&ids.has(e.cultivation_id)).length;
  return <div className="independent-overview"><section className="team-hero independent-hero"><div><span className="team-role-tag"><Sprout size={14}/>{t('MY FARM WORKSPACE')}</span><h2>{t('Your farm, with a clearer view of every season.')}</h2><p><span>{t('Welcome back')}, </span>{data.user.name}. {t('Keep your lands, daily work and cultivation costs together. Plan your next step with your own records.')}</p><div className="team-hero-actions"><button className="button" disabled={!active} onClick={onExpense}><Receipt size={16}/>{t('Record an expense')}<ArrowUpRight size={16}/></button><button className="team-secondary" onClick={onCultivations}>{t('View my cultivations')} →</button><button className="team-secondary" onClick={onLands}>{t('Manage my lands')} →</button></div></div><div className="team-hero-aside"><span className="team-hero-symbol"><Sprout size={31}/></span><strong>{active}<small>{t('Active cultivations in view')}</small></strong><span>{t('Your records. Your decisions.')}</span></div></section><div className="team-metrics"><div><span><MapPin size={18}/>{t('My registered lands')}</span><strong>{(data.lands||[]).length}</strong></div><div><span><Tractor size={18}/>{t('My cultivations in view')}</span><strong>{cultivations.length}</strong></div><div><span><Receipt size={18}/>{t('Current expense records in view')}</span><strong>{expenseCount}</strong></div></div></div>;
}
