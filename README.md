<p align="center">
  <img src="public/gslogo.png" alt="GradeSeer logo" width="120" />
</p>

# GradeSeer

**The smart way to track, project, and improve your grades.**

[Live Demo](https://my-gradeseer.vercel.app) • [Report Bug](https://github.com/zarkysgascon/GradeSeer/issues)

---

## About

GradeSeer is a grade management platform built for college students who need to track their performance across multiple courses. It provides real-time grade calculations, unit-weighted GPA tracking, and AI-powered study recommendations.

**Key Features:**
- Track grades across all your subjects
- See your semester GPA weighted by course units
- Get AI recommendations on what to study and prioritize
- Know your worst-case and best-case final grade scenarios
- Understand which assessments actually matter for your grade

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma, PostgreSQL
- **AI:** Google Gemini API
- **Deployment:** Vercel

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Gemini API key ([get one free here](https://ai.google.dev/))

### Installation

1. Clone the repo
```bash
   git clone https://github.com/zarkysgascon/GradeSeer.git
   cd GradeSeer
```

2. Install dependencies
```bash
   npm install
```

3. Set up environment variables
   
   Create `.env.local`:
```env
   DATABASE_URL="postgresql://user:password@localhost:5432/gradeseer"
   GEMINI_API_KEY="your_api_key_here"
   NEXTAUTH_SECRET="your_secret"
   NEXTAUTH_URL="http://localhost:3000"
```

4. Set up database
```bash
   npx prisma generate
   npx prisma migrate dev
```

5. Run the app
```bash
   npm run dev
```

   Open [http://localhost:3000](http://localhost:3000)

---

## Usage

1. **Add a subject** - Click "+ Add New Subject" and configure your grade components
2. **Log grades** - Enter your scores as you receive them
3. **Track progress** - View your current grade, projected final grade, and GPA
4. **Get AI help** - Ask the AI assistant for study recommendations and strategic advice

---

## Project Structure
```
GradeSeer/
├── app/                  # Next.js pages and API routes
├── components/           # React components
├── lib/                  # Utilities and business logic
├── prisma/               # Database schema
└── public/               # Static assets
```

---

## Team

**Academic Project for:** Software Engineering Process, Functional Programming, Database Management, Web Development, and Software Engineering Tools & Practices

**Team Members:**
- Bryan Del Rosario - [@YusCML](https://github.com/YusCML) (Product Owner)
- Zarkys Gascon - [@zarkysgascon](https://github.com/zarkysgascon) (Scrum Master)
- Fletcher Malala - [@EMB-revenge](https://github.com/EMB-revenge)
- Amiel Mirasol - [@amiel-dotcom](https://github.com/amiel-dotcom)
- Nikko Lut - [@NekoNikkoLut](https://github.com/NekoNikkoLut)
- Denver Alejandro - [@neilacapuccino](https://github.com/neilacapuccino)
- Sidryl Gerardo - [@Sidryll](https://github.com/Sidryll)

---

## Acknowledgments

Built with Next.js, Prisma, shadcn/ui, and Google Gemini AI.

Developed as an academic project to help students strategically manage their grades.

---

**For issues or questions, open an issue on GitHub.**
