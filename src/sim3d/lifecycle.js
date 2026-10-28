// Owns everything a 3D session allocates so teardown is one call: listeners (via an AbortSignal),
// GPU resources (anything with dispose()) and arbitrary cleanup callbacks. dispose() is idempotent.
export function createLifecycle(){
 const abort=new AbortController(),resources=new Set(),cleanups=[];let disposed=false;
 return {
  signal:abort.signal,
  get disposed(){return disposed;},
  own(resource){if(disposed){resource?.dispose?.();return resource;}if(resource)resources.add(resource);return resource;},
  release(resource){if(resources.delete(resource))resource.dispose?.();},
  onCleanup(fn){if(disposed)fn();else cleanups.push(fn);},
  dispose(){
   if(disposed)return;disposed=true;abort.abort();
   for(const fn of cleanups.splice(0).reverse()){try{fn();}catch(error){console.warn('3D cleanup failed:',error.message);}}
   for(const resource of resources){try{resource.dispose?.();}catch(error){console.warn('3D dispose failed:',error.message);}}
   resources.clear();
  }
 };
}
