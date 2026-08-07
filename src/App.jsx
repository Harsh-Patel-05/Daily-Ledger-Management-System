import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import { ModalProvider } from './context/ModalContext';
import { TourProvider } from './context/TourContext';
import AppRoutes from './routes/AppRoutes';
import GlobalModals from './components/modals/GlobalModals';
import NotificationWatcher from './components/NotificationWatcher';
import ProductTour from './components/tour/ProductTour';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppProvider>
              <ModalProvider>
                <TourProvider>
                  <AppRoutes />
                  <GlobalModals />
                  <NotificationWatcher />
                  <ProductTour />
                </TourProvider>
              </ModalProvider>
            </AppProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
