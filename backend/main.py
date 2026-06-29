from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import uuid

app = FastAPI(title="WebSockets PoC - Real-Time Task Board")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, socketio_path='/socket.io')
app.mount('/ws', sio_app)

class Task(BaseModel):
    id: str
    title: str
    description: str
    status: str
    assignee: Optional[str] = None
    created_at: str
    updated_at: str

boards: Dict[str, List[Task]] = {
    "board-1": [
        Task(
            id=str(uuid.uuid4()),
            title="Setup project repository",
            description="Initialize git repo and add README",
            status="done",
            assignee="Alice",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        ),
        Task(
            id=str(uuid.uuid4()),
            title="Implement authentication",
            description="Add JWT-based auth system",
            status="in-progress",
            assignee="Bob",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        ),
        Task(
            id=str(uuid.uuid4()),
            title="Deploy to production",
            description="Setup CI/CD and deploy to AWS",
            status="todo",
            assignee=None,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
    ]
}

connected_users: Dict[str, str] = {}

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('connected', {'sid': sid})

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in connected_users:
        user = connected_users.pop(sid)
        await sio.emit('user_left', {'user': user})

@sio.event
async def join_board(sid, data):
    board_id = data.get('board_id', 'board-1')
    user = data.get('user', 'Anonymous')
    
    await sio.enter_room(sid, board_id)
    connected_users[sid] = user
    
    tasks = boards.get(board_id, [])
    await sio.emit('board_state', {'board_id': board_id, 'tasks': [t.dict() for t in tasks]}, room=sid)
    
    await sio.emit('user_joined', {'user': user, 'board_id': board_id}, room=board_id)
    print(f"{user} joined board {board_id}")

@sio.event
async def create_task(sid, data):
    board_id = data.get('board_id', 'board-1')
    task_data = data.get('task', {})
    
    task = Task(
        id=str(uuid.uuid4()),
        title=task_data.get('title', 'New Task'),
        description=task_data.get('description', ''),
        status=task_data.get('status', 'todo'),
        assignee=task_data.get('assignee'),
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )
    
    if board_id not in boards:
        boards[board_id] = []
    boards[board_id].append(task)
    
    await sio.emit('task_created', {'board_id': board_id, 'task': task.dict()}, room=board_id)
    print(f"Task created in {board_id}: {task.title}")

@sio.event
async def update_task(sid, data):
    board_id = data.get('board_id', 'board-1')
    task_id = data.get('task_id')
    updates = data.get('updates', {})
    
    if board_id in boards:
        for task in boards[board_id]:
            if task.id == task_id:
                if 'title' in updates:
                    task.title = updates['title']
                if 'description' in updates:
                    task.description = updates['description']
                if 'assignee' in updates:
                    task.assignee = updates['assignee']
                task.updated_at = datetime.now().isoformat()
                
                await sio.emit('task_updated', {'board_id': board_id, 'task': task.dict()}, room=board_id)
                print(f"Task updated in {board_id}: {task.title}")
                break

@sio.event
async def move_task(sid, data):
    board_id = data.get('board_id', 'board-1')
    task_id = data.get('task_id')
    new_status = data.get('new_status')
    
    if board_id in boards:
        for task in boards[board_id]:
            if task.id == task_id:
                task.status = new_status
                task.updated_at = datetime.now().isoformat()
                
                await sio.emit('task_moved', {'board_id': board_id, 'task': task.dict()}, room=board_id)
                print(f"Task moved in {board_id}: {task.title} -> {new_status}")
                break

@sio.event
async def delete_task(sid, data):
    board_id = data.get('board_id', 'board-1')
    task_id = data.get('task_id')
    
    if board_id in boards:
        boards[board_id] = [t for t in boards[board_id] if t.id != task_id]
        await sio.emit('task_deleted', {'board_id': board_id, 'task_id': task_id}, room=board_id)
        print(f"Task deleted from {board_id}: {task_id}")

@app.get("/")
def read_root():
    return {"message": "WebSockets PoC API", "status": "running", "websocket": "/ws"}

@app.get("/api/boards/{board_id}/tasks")
async def get_board_tasks(board_id: str):
    tasks = boards.get(board_id, [])
    return {"board_id": board_id, "tasks": [t.dict() for t in tasks]}
