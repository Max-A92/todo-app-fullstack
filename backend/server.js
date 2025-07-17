const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// JSON Parser
app.use(express.json());

// CORS für Frontend-Kommunikation
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const tasksFile = path.join(__dirname, 'tasks.json');

function loadTasks() {
    try {
        const data = fs.readFileSync(tasksFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function saveTasks(tasks) {
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
}

app.get('/tasks', (req, res) => {
    const tasks = loadTasks();
    res.json(tasks);
});

app.post('/tasks', (req, res) => {
    const tasks = loadTasks();
    const newTask = {
        id: Date.now(),
        text: req.body.text,
        status: 'offen'
    };
    tasks.push(newTask);
    saveTasks(tasks);
    res.status(201).json(newTask);
});

// Route zum Ändern des Status (offen ↔ erledigt)
app.put('/tasks/:id', (req, res) => {
    const tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        return res.status(404).json({error: 'Aufgabe nicht gefunden'});
    }
    
    task.status = task.status === 'offen' ? 'erledigt' : 'offen';
    task.updatedAt = new Date().toISOString();
    
    saveTasks(tasks);
    res.json(task);
});

// Route zum Löschen einer einzelnen Aufgabe (DELETE /tasks/{id})
app.delete('/tasks/:id', (req, res) => {
    const tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
        return res.status(404).json({error: 'Aufgabe nicht gefunden'});
    }
    
    const deletedTask = tasks.splice(taskIndex, 1)[0];
    saveTasks(tasks);
    
    res.json({message: 'Aufgabe gelöscht', task: deletedTask});
});

// Route zum Löschen aller erledigten Aufgaben (DELETE /tasks?status=completed)
app.delete('/tasks', (req, res) => {
    const tasks = loadTasks();
    const status = req.query.status;
    
    if (status === 'completed' || status === 'erledigt') {
        // Nur offene Aufgaben behalten
        const remainingTasks = tasks.filter(task => task.status === 'offen');
        const deletedCount = tasks.length - remainingTasks.length;
        
        saveTasks(remainingTasks);
        res.json({
            message: `${deletedCount} erledigte Aufgaben gelöscht`,
            deletedCount: deletedCount
        });
    } else {
        res.status(400).json({error: 'Parameter status=completed erforderlich'});
    }
});

// NEU: Route zum Bearbeiten des Texts einer Aufgabe (PUT /tasks/{id}/text)
app.put('/tasks/:id/text', (req, res) => {
    const tasks = loadTasks();
    const taskId = parseInt(req.params.id);
    const newText = req.body.text;
    
    if (!newText || newText.trim() === '') {
        return res.status(400).json({error: 'Aufgabentext darf nicht leer sein'});
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        return res.status(404).json({error: 'Aufgabe nicht gefunden'});
    }
    
    // Text aktualisieren
    task.text = newText.trim();
    task.updatedAt = new Date().toISOString();
    
    saveTasks(tasks);
    res.json(task);
});

app.listen(PORT, () => {
    console.log('Server mit CORS läuft auf Port 3000');
});