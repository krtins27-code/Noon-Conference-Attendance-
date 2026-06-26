import { Routes, Route, NavLink } from "react-router-dom";
import CheckIn from "./pages/CheckIn.jsx";
import Today from "./pages/Today.jsx";
import Organizer from "./pages/Organizer.jsx";

function NavTab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex-1 text-center py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-brand-600">Noon Conference</h1>
        </div>
        <nav className="max-w-md mx-auto px-3 pb-2 flex gap-2">
          <NavTab to="/">Check In</NavTab>
          <NavTab to="/today">Today</NavTab>
          <NavTab to="/organizer">Organizer</NavTab>
        </nav>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<CheckIn />} />
          <Route path="/today" element={<Today />} />
          <Route path="/organizer" element={<Organizer />} />
        </Routes>
      </main>
    </div>
  );
}
