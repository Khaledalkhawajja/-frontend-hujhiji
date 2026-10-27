// Every user-visible string lives here so the app can be translated (Arabic is planned).
// Keep keys stable; add an `ar` object with the same shape when translation starts.

export const en = {
  appName: "AI Classroom",
  appTagline: "Smart classroom attendance",
  roles: { STUDENT: "Student", INSTRUCTOR: "Instructor", ADMIN: "Admin" },
  nav: {
    schedule: "Schedule",
    myCourses: "My courses",
    myDisputes: "My disputes",
    sections: "My sections",
    disputes: "Disputes",
    dashboard: "Dashboard",
    users: "Users",
    courses: "Courses",
    sectionsAdmin: "Sections",
    halls: "Lecture halls",
    enrollments: "Enrollments",
    cameras: "Cameras",
    attendance: "Attendance",
    reports: "Reports",
    university: "University settings",
    profile: "My profile",
    teaching: "Teaching",
    people: "People & courses",
    campus: "Campus",
    attendanceGroup: "Attendance",
    system: "System",
  },
  shell: {
    openMenu: "Open menu",
    closeMenu: "Close menu",
    accountMenu: "Account menu",
    logout: "Log out",
    themeLight: "Switch to light mode",
    themeDark: "Switch to dark mode",
    language: "Language",
    arabicSoon: "Arabic is coming soon",
    skipToContent: "Skip to content",
  },
  auth: {
    loginTitle: "Log in",
    loginIntro: "Use your university email and password.",
    email: "University email",
    password: "Password",
    submit: "Log in",
    submitting: "Logging in…",
    forgot: "Forgot password?",
    badCredentials: "Wrong email or password, or the account isn't activated yet.",
    checking: "Checking your session…",
  },
  placeholder: {
    comingIn: (phase: number) => `This page is built in Phase ${phase}.`,
  },
  notFound: {
    title: "Page not found",
    body: "The page you're looking for doesn't exist.",
    home: "Go to my home page",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    retry: "Try again",
  },
} as const;

export const t = en;
