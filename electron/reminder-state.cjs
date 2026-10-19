function todoReminderKey(noteId,todo={}){
  if(!todo.id||!todo.reminder||!todo.due||!String(todo.text||'').trim())return '';
  return `todo:${noteId}:${todo.id}:${todo.due}:${todo.dueTime||'18:00'}:${todo.reminder}`;
}

function timelineReminderKey(noteId,event={}){
  if(!event.id||event.done||!String(event.text||'').trim())return '';
  const match=String(event.time||'').match(/(\d{4}-\d{2}-\d{2})\D+(\d{2}:\d{2})/);
  return match?`timeline:${noteId}:${event.id}:${match[1]}T${match[2]}`:'';
}

function activeSourceIsValid(item,notes){
  const note=(notes||[]).find(entry=>entry.id===item?.noteId);
  if(!note)return false;
  if(item.type==='todo'){
    const todo=(note.todos||[]).find(entry=>entry.id===item.itemId);
    return Boolean(todo&&todoReminderKey(note.id,todo)===item.key);
  }
  if(item.type==='timeline'){
    const event=(note.events||[]).find(entry=>entry.id===item.itemId);
    return Boolean(event&&timelineReminderKey(note.id,event)===item.key);
  }
  return false;
}

function changedTodoSources(previousNotes,nextNotes){
  const changed=new Set();
  for(const note of previousNotes||[]){
    const nextNote=(nextNotes||[]).find(entry=>entry.id===note.id);
    for(const todo of note.todos||[]){
      const nextTodo=(nextNote?.todos||[]).find(entry=>entry.id===todo.id);
      if(!nextTodo||todoReminderKey(note.id,todo)!==todoReminderKey(note.id,nextTodo))changed.add(`todo:${note.id}:${todo.id}`);
    }
    for(const event of note.events||[]){
      const nextEvent=(nextNote?.events||[]).find(entry=>entry.id===event.id);
      if(!nextEvent||timelineReminderKey(note.id,event)!==timelineReminderKey(note.id,nextEvent))changed.add(`timeline:${note.id}:${event.id}`);
    }
  }
  return changed;
}

function reconcileReminderState(previousState,nextState){
  const next=structuredClone(nextState||{});
  const reminder=next.reminderState||{activeItems:[],handled:{},emailQueue:[]};
  reminder.activeItems||=[];reminder.handled||={};reminder.emailQueue||=[];
  const changed=changedTodoSources(previousState?.notes||[],next.notes||[]);
  const reject=item=>changed.has(`${item?.type}:${item?.noteId}:${item?.itemId}`)||!activeSourceIsValid(item,next.notes||[]);
  reminder.activeItems=reminder.activeItems.filter(item=>{if(!reject(item))return true;if(item?.key)reminder.handled[item.key]=true;return false;});
  reminder.emailQueue=reminder.emailQueue.filter(item=>{
    const active={...item};
    if(!active.type&&typeof active.key==='string'){
      const [type,noteId,itemId]=active.key.split(':');Object.assign(active,{type,noteId,itemId});
    }
    return !reject(active);
  });
  next.reminderState=reminder;return next;
}

module.exports={todoReminderKey,timelineReminderKey,activeSourceIsValid,reconcileReminderState};

