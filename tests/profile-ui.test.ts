import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfilePanel } from "../app/profile-panel";
import { LanguageProvider } from "../app/language";
const user={id:'test',public_id:'FR-TEST',account_type:'independent',name:'Test Farmer',mobile:'+94770000001',email:'',district:'Test District',village:'Test Village'};
const render=(account_type:string,si=false)=>renderToStaticMarkup(createElement(LanguageProvider,{enabled:si,initial:si?'si':'en',children:createElement(ProfilePanel,{user:{...user,account_type},onRefresh:async()=>{}})}));
test("only the self-employed category receives profile editing UI",()=>{
  const html=render('independent');assert(html.includes('Edit profile'));assert(html.includes('FR-TEST'));assert(html.includes('Test District'));
  for(const role of ['organization_farmer','organization_owner','supervisor','admin'])assert.equal(render(role),'');
});
test("profile labels translate without changing the farmer's saved details",()=>{
  const html=render('independent',true);assert(html.includes('පැතිකඩ වෙනස් කරන්න'));assert(html.includes('Test Farmer'));assert(html.includes('FR-TEST'));
});
