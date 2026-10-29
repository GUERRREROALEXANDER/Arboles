import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "./components/layout/AppShell";
import { PageSkeleton } from "./components/layout/PageSkeleton";
import { SpecimenDrawer } from "./features/specimen/SpecimenDrawer";
import { pageVariants } from "./lib/motion";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const TaxonomyPage = lazy(() => import("./pages/TaxonomyPage"));
const WorkshopPage = lazy(() => import("./pages/WorkshopPage"));
const DbhIndexPage = lazy(() => import("./pages/DbhIndexPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export function App() {
  const location = useLocation();

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          <Suspense fallback={<PageSkeleton />}>
            <Routes location={location}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/taxonomy" element={<TaxonomyPage />} />
              <Route path="/workshop" element={<WorkshopPage />} />
              <Route path="/index" element={<DbhIndexPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
      <SpecimenDrawer />
    </AppShell>
  );
}
