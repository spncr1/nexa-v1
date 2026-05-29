# NEXA - Student Workload Management Tool
A student-focused web application designed to centralise assignment tracking, task management, and academic workload within a single interface.

My motivation behind building this project was to address how overwhelming managing academic work across multiple disconnected productivity platforms can be. Rather than splitting workflows across different apps, I wanted to create a cleaner, more structured interface that makes it easier to track assignments, organise smaller tasks, and visualise day-to-day workload more effectively. The project has also become a way for me to explore how a practical student-facing tool can evolve from a frontend-driven application initially, into a more complete, full-stack system.

*Live version: https://nexa-v1.vercel.app/*

---

## Features
- **Dashboard home page**
    - Overview of today's tasks and assignments due today
    - Calendar view for quick navigation
- **Tasks Planner**
    - Weekly and monthly planning views
    - Ability to schedule tasks across days and times
- **Assignments tracker**
    - Track assignments per subject
    - View assessment weightings
    - Assignment status tracking i.e., not started, in progress, completed
- **Interactive visualisations**
    - Multiple widgets and visual charts for quick reference
    - Charts showing assignment weightings per assessment for a subject
    - Progress and priority dashboards
- **Dark Mode**
    - Toggle between light and dark mode interfaces to account for different user preferences
- **Data Storage**
    - The current version utilises a Node.js, Express, and PostgreSQLL backend to support user authentication, persistent data storage, and multi-user scalability
---

## Screenshots
### Dashboard Overview
![Dashboard](/client/shared/assets/Screenshots/app-screenshot-1.png)

### Weekly Task Planner
![Tasks Planner](/client/shared/assets/Screenshots/app-screenshot-2.png)

### Monthly Calendar View
![Calendar](/client/shared/assets/Screenshots/app-screenshot-3.png)

### Assignment Analytics & Visual Widgets
![Assignments](/client/shared/assets/Screenshots/app-screenshot-4.png)

### Dark Mode
![Dark Mode](/client/shared/assets/Screenshots/app-screenshot-5.png)

---

## Tech Stack
- **HTML**
- **CSS**
- **JavaScript**
- **Chart.js** for data visualisations
- **Vercel** for deployment
- **Node.js** for backend
- **Express** for backend
- **PostgreSQL** for backend

---

## Running the Project (locally)
Clone the repoistory:
```bash
https://github.com/spncr1/nexa-v1.git
```

Run the development server:
```bash
npm run dev
```

Then open the local URL shown in the terminal:
```bash
http://localhost:3000/login
```

This command starts the Express app with `nodemon`. The app also needs a reachable PostgreSQL database using the values in `.env`.

---

## Future Improvements
- Continued refinement of the interface and overall user workflow
- Mobile optimisation
- Notifications & reminder systems
- Additional producitivity analytics & visuals
- Additional features with practical usage beyond a solely school/university focus
