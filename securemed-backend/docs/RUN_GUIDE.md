# How to Run SecureMed 🚀

You have two options to run the application. **Option 1 (Docker)** is recommended because it handles the database and networking for you.

## Option 1: Docker (Recommended)
Docker runs the Frontend, Backend, and Database in separate "containers" that talk to each other automatically.

### 1. Start everything
Run this command in the root directory (where `docker-compose.yml` is):
```bash
docker-compose up --build
```

### 2. Access the App
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

### 3. Create a Superuser (Admin)
Since the database is fresh, you need an admin account. Run this in a new terminal window:
```bash
docker-compose exec backend python manage.py createsuperuser
```
Follow the prompts to set your email and password.

### 4. Stop everything
Press `Ctrl+C` in the terminal, or run:
```bash
docker-compose down
```

---

## Option 2: Manual Setup
Use this if you want to run things individually for development.

### 1. Database (PostgreSQL)
You need PostgreSQL installed and running locally.
- Create a database named `securemed`.
- Update `securemed-backend/.env` with your DB credentials.

### 2. Backend (Django)
*Terminal 1:*
```bash
cd securemed-backend
source venv/bin/activate
python manage.py runserver
```

### 3. Frontend (Next.js)
*Terminal 2:*
```bash
cd securemed-frontend
npm install  # Only first time
npm run dev
```

---

## 🐳 How Docker Works Here
Think of `docker-compose.yml` as a conductor for an orchestra.

1.  **db service**: Downloads a PostgreSQL image and runs it. It saves data in a "volume" so you don't lose patients when you restart.
2.  **backend service**: Builds your Django code into a container. It waits for the database to be ready (`depends_on: db`) before starting.
3.  **frontend service**: Builds your Next.js code. It knows where the backend is because they share a virtual network.

**Why use it?**
- You don't need to install Python, Node, or Postgres manually on your machine.
- It "just works" the same way on every computer.
