import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demonstrationPasswordsEnabled, passwordAccepted, passwordSchema } from "../lib/password-policy";
import { PasswordPolicyProvider, PasswordInput, passwordInputProps } from "../app/password-policy";

test("normal passwords stay strong; local demo permits exactly four/five ASCII digits",()=>{
 for(const p of ["1234","01234"]) {assert.equal(passwordAccepted(p,true),true);assert.equal(passwordAccepted(p,false),false);}
 for(const p of ["123","123456","abcd","12a4"," 1234","1234 ","１２３４"])assert.equal(passwordAccepted(p,true),false);
 assert.equal(passwordAccepted("Long-password-2026!",false),true);assert.equal(passwordAccepted("Long-password-2026!",true),true);
 assert.equal(passwordAccepted("a".repeat(257),true),false);
});
test("demo policy is explicit, server controlled and disabled for HTTPS or external origins",()=>{
 const keys=["FARMWISE_DEMO_PASSWORDS","FARMWISE_HTTPS","FARMWISE_ORIGIN"];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  for(const k of keys)delete process.env[k];assert.equal(demonstrationPasswordsEnabled(),false);
  process.env.FARMWISE_DEMO_PASSWORDS="true";assert.equal(demonstrationPasswordsEnabled(),true);assert.equal(passwordSchema.safeParse("1234").success,true);
  process.env.FARMWISE_ORIGIN="http://127.0.0.1:3108";assert.equal(demonstrationPasswordsEnabled(),true);
  process.env.FARMWISE_ORIGIN="https://example.com";assert.equal(demonstrationPasswordsEnabled(),false);assert.equal(passwordSchema.safeParse("1234").success,false);
  process.env.FARMWISE_ORIGIN="http://localhost:3000";process.env.FARMWISE_HTTPS="true";assert.equal(demonstrationPasswordsEnabled(),false);
  delete process.env.FARMWISE_HTTPS;delete process.env.FARMWISE_ORIGIN;process.env.FARMWISE_DEMO_PASSWORDS="false";assert.equal(passwordSchema.safeParse("12345").success,false);
 }finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
});
test("demo form constraints preserve masking and existing long passwords",()=>{
 const props={type:"password",minLength:12,maxLength:256};const demo=passwordInputProps(props,true);
 assert.equal(demo.type,"password");assert.equal(demo.minLength,4);assert(new RegExp('^'+demo.pattern+'$').test("01234"));assert(!new RegExp('^'+demo.pattern+'$').test("abcd"));assert.equal(passwordInputProps(props,false).minLength,12);
 const html=renderToStaticMarkup(createElement(PasswordPolicyProvider,{demonstration:true,children:createElement('div',null,'Content')}));assert(!html.includes('Demonstration mode'));assert(html.includes('Content'));
});

 test("password hints appear only beside new password fields, in the selected language",async()=>{
  const { LanguageProvider }=await import("../app/language");
  const render=(name:string,minLength:number,initial:"en"|"si",demonstration=true)=>renderToStaticMarkup(createElement(LanguageProvider,{enabled:true,initial,children:createElement(PasswordPolicyProvider,{demonstration,children:createElement(PasswordInput,{inputProps:{name,type:"password",minLength}})})}));
  const html=render("password",12,"en");assert(html.includes("Use a 4–5 digit number."));assert(html.includes("aria-describedby"));assert(!html.includes("Demonstration mode"));
  assert(render("password",12,"si").includes("ඉලක්කම් 4–5ක අංකයක්"));
  assert(!render("password",1,"en").includes('class="password-hint"'));
  assert(!render("currentPassword",undefined as any,"en").includes('class="password-hint"'));
  assert(!render("confirm_password",12,"en").includes('class="password-hint"'));
  assert(render("password",12,"en",false).includes("between 12 and 256 characters"));
 });
