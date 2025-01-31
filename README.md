# **Todolist App**

A **Flask**-based web app for **task management** with **Pomodoro** timer and **AI** features.
 Tasks are stored in an **SQLite** database.

------

### 🎥 **Demo Video** 🎥

[![Watch the Demo](https://www.youtube.com/embed/QmYHRgh2FDA)]

------

## **Features**

- **Pomodoro** ⏲️
  - Focus timer for studying or working.
  - Break reminders for mental rest.
- **AI Task Creator** 🤖
  - Uses **Ollama deepseek r1 1.5b** for generating task ideas.
  - Quick brainstorming for your to-dos.
- **SQL Database** 🗄️
  - Stores tasks in `todos.db`.
  - Automatic creation if not present.
- **Simple Web Interface** 🏠
  - Powered by **Flask**.
  - Frontend: **HTML**, **CSS**, **JavaScript**.

------

## **Requirements**

| **Tool**   | **Version** |
| ---------- | ----------- |
| Python     | >= 3.7      |
| Flask      | 2.3.3       |
| Flask-CORS | 4.0.0       |
| Werkzeug   | 2.3.7       |
| watchdog   | 3.0.0       |
| requests   | 2.31.0      |
| ollama     | >= 0.1.0    |
| pathlib    | >= 1.0.1    |

**Note**: Make sure [**ollama**](https://github.com/jmorganca/ollama) is installed if using AI features.

------

## **Installation**

1. Clone the Repository

   ```bash
   git clone https://github.com/AbdullhHassan/TodoList
   cd TodoList
   ```

2. Run the Script

   ```bash
   python run.py
   ```

   - Will ask if you want to **create a virtual environment**.
   - Will **install** missing packages if you **approve**.

------

## **Usage**

## **Usage**

| **Step**            | **Action**                                                   | **Emoji** |
| ------------------- | ------------------------------------------------------------ | --------- |
| **1. Start App**    | *Run* `run.py`, then **choose** "Start app" in the menu. Access at [127.0.0.1:5000](http://127.0.0.1:5000). | 🚀         |
| **2. Stop/Restart** | *Use* menu options to **stop** or **restart** at any time.   | 🔁         |
| **3. Pomodoro**     | *Set* a **focus time** on the web interface. *Wait* for notification when it's **break time**. | ⏲️         |
| **4. AI Tasks**     | *Click* **"Generate with AI"** to get **Ollama**-powered task ideas. | 🤖         |



------

## **Virtual Environment Activation**

| **OS**        | **Activation Command**     |
| ------------- | -------------------------- |
| **Linux/Mac** | `source venv/bin/activate` |
| **Windows**   | `.\venv\Scripts\activate`  |

**(If you chose to create a venv.)**

---

**"Life is short—let’s make it productive and fun!"**

------

## **Additional Info**

- **Database** (`todos.db`) is automatically created on first run.

- **Configuration** can be customized in `config.json` or code.

  
