// Prevent a previous offline build from masking changes in local development.
if(['localhost','127.0.0.1'].includes(location.hostname)&&'serviceWorker' in navigator){
  const registrations=await navigator.serviceWorker.getRegistrations();
  if(registrations.length){await Promise.all(registrations.map(registration=>registration.unregister()));await Promise.all((await caches.keys()).filter(key=>key.startsWith('panda-modes-')).map(key=>caches.delete(key)));}
  if(navigator.serviceWorker.controller)location.reload();else await import('./app.js');
}else await import('./app.js');
