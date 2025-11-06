const getAncestorsUtil=(elem)=>{
  const ancestors=[];
  let parent=elem.parentElement;
  while(parent&&parent!==document.body){
    ancestors.push(parent);
    parent=parent.parentElement;
  }
  ancestors.push(window);
  return ancestors;
};
export default getAncestorsUtil;

