import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demonstrationPasswordsEnabled, passwordAccepted, passwordSchema } from "../lib/password-policy";
import { PasswordPolicyProvider, passwordInputProps } from "../app/password-policy";

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
 const html=renderToStaticMarkup(createElement(PasswordPolicyProvider,{demonstration:true,children:createElement('div',null,'Content')}));assert(html.includes('Demonstration mode'));assert(html.includes('Content'));
});
