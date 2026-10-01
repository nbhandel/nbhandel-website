document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const target=a.getAttribute('href'),el=target&&target.length>1?document.querySelector(target):null;
    if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});}
  }));
  const search=document.getElementById('mobileSearchBtn'), navSearch=document.getElementById('navSearchBtn');
  if(search&&navSearch)search.addEventListener('click',()=>navSearch.click());
  const theme=document.getElementById('themeToggle');
  if(theme){
    const sync=()=>{theme.querySelector('b').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾'};
    sync();
    theme.addEventListener('click',()=>{
      const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
      document.documentElement.dataset.theme=next;localStorage.setItem('nbh_theme_v1',next);sync();
    });
  }
});