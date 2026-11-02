/* QuadTree em coordenadas métricas (x,y em metros): distâncias exatas, sem distorção de graus */
class QT{
 constructor(x0,y0,x1,y1,cap,md,d=0){const cf=typeof cap==='function'?cap:null;Object.assign(this,{x0,y0,x1,y1,cf,cap:cf?cf((x0+x1)/2,(y0+y1)/2):cap,md,d,mx:(x0+x1)/2,my:(y0+y1)/2,pts:[],ch:null,n:0})}
 ins(p){this.n++;if(!this.ch){if(this.pts.length<this.cap||this.d>=this.md){this.pts.push(p);return}this.split()}this.ch[(p.x>=this.mx)+2*(p.y>=this.my)].ins(p)}
 split(){const{x0,y0,x1,y1,mx,my,cap,md,d}=this;this.ch=[[x0,y0,mx,my],[mx,y0,x1,my],[x0,my,mx,y1],[mx,my,x1,y1]].map(b=>new QT(...b,this.cf||cap,md,d+1));for(const p of this.pts)this.ch[(p.x>=mx)+2*(p.y>=my)].ins(p);this.pts=[]}
 d2(x,y){const dx=Math.max(this.x0-x,0,x-this.x1),dy=Math.max(this.y0-y,0,y-this.y1);return dx*dx+dy*dy}
 leaves(o){if(this.ch)this.ch.forEach(c=>c.leaves(o));else if(this.n)o.push(this);return o}
 rect(a,b,c,d,o){if(!this.n||this.x1<a||this.x0>c||this.y1<b||this.y0>d)return o;if(this.ch)for(const q of this.ch)q.rect(a,b,c,d,o);else for(const p of this.pts)if(p.x>=a&&p.x<=c&&p.y>=b&&p.y<=d)o.push(p);return o}
 rng(x,y,r,o,st){st.v++;if(!this.n||this.d2(x,y)>r*r)return o;if(this.ch)for(const c of this.ch)c.rng(x,y,r,o,st);else for(const p of this.pts){const a=p.x-x,b=p.y-y;if(a*a+b*b<=r*r)o.push(p)}return o}
 knn(x,y,k,b,st){st.v++;if(this.ch){const f=(x>=this.mx)+2*(y>=this.my);for(let i=0;i<4;i++){const c=this.ch[i===0?f:i===f?0:i];if(!c.n)continue;if(b.length===k&&c.d2(x,y)>b[k-1].d)continue;c.knn(x,y,k,b,st)}}
  else for(const p of this.pts){const d=(p.x-x)**2+(p.y-y)**2;if(b.length<k||d<b[b.length-1].d){let i=b.length;b.push(null);while(i>0&&b[i-1].d>d){b[i]=b[i-1];i--}b[i]={p,d};if(b.length>k)b.pop()}}return b}
}

