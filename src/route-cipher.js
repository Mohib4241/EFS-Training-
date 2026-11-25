// Page addresses. The part of the web address after # names the page (a machine, its checklist...). It is scrambled, so the
// address bar shows something like #Qv3k9xT0aWmZc instead of the machine's name, and it is unscrambled when the page opens.
//
// This is a keyed stream cipher with a check code, used to keep the address unreadable at a glance. It is not secure
// encryption: the key travels with the page, so anyone who studies the site's code can undo it. The address never leaves the
// browser (the part after # is not sent to the server), and every visit gets a fresh scramble, so the same page shows
// different addresses.
const KEY='efs-academy/route/v1';
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function hash(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
// a small keyed generator seeded from the key and the two random bytes of this address
function keystream(nonce){let s=hash(KEY+':'+nonce[0]+'.'+nonce[1])||1;return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)&255;};}
const check=bytes=>{let h=hash(KEY+'#check');for(const b of bytes)h=Math.imul(h^b,16777619)>>>0;return [h&255,(h>>>8)&255];};
function toText(bytes){let out='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|((bytes[i+1]??0)<<8)|(bytes[i+2]??0),count=Math.min(3,bytes.length-i);for(let k=0;k<=count;k++)out+=ALPHABET[(n>>(18-6*k))&63];}return out;}
function fromText(text){
 const values=[];for(const c of text){const v=ALPHABET.indexOf(c);if(v<0)return null;values.push(v);}
 const bytes=[];for(let i=0;i<values.length;i+=4){const group=values.slice(i,i+4);if(group.length===1)return null;const n=group.reduce((acc,v,k)=>acc|(v<<(18-6*k)),0);for(let k=0;k<group.length-1;k++)bytes.push((n>>(16-8*k))&255);}
 return bytes;
}
const randomBytes=()=>{const a=new Uint8Array(2);try{crypto.getRandomValues(a);}catch{a[0]=Math.random()*256;a[1]=Math.random()*256;}return [a[0],a[1]];};
export function encodeRoute(route,nonce=randomBytes()){
 const plain=[...new TextEncoder().encode(String(route))],next=keystream(nonce);
 return toText([...nonce,...[...plain,...check(plain)].map(b=>b^next())]);
}
// The page named by an address, or null when it was not made by encodeRoute (or has been altered).
export function decodeRoute(token){
 const bytes=fromText(String(token||''));if(!bytes||bytes.length<5)return null;
 const nonce=[bytes[0],bytes[1]],next=keystream(nonce),plain=bytes.slice(2).map(b=>b^next()),sum=plain.splice(-2);
 const expected=check(plain);if(sum[0]!==expected[0]||sum[1]!==expected[1])return null;
 try{return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(plain));}catch{return null;}
}
