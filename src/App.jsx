import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AppProvider } from './context/AppContext';
import { InventoryProvider } from './context/InventoryContext';
import { LocalModulesProvider } from './context/LocalModulesContext';
import { ModalProvider } from './context/ModalContext';
import { TourProvider } from './context/TourContext';
import AppRoutes from './routes/AppRoutes';
import GlobalModals from './components/modals/GlobalModals';
import NotificationWatcher from './components/NotificationWatcher';
import InventoryAlertWatcher from './components/InventoryAlertWatcher';
import ProductTour from './components/tour/ProductTour';
import { clearLegacyStaticStorage } from './utils/clearLegacyStorage';

clearLegacyStaticStorage();

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppProvider>
              <InventoryProvider>
                <LocalModulesProvider>
                  <ModalProvider>
                    <TourProvider>
                      <AppRoutes />
                      <GlobalModals />
                      <NotificationWatcher />
                      <InventoryAlertWatcher />
                      <ProductTour />
                    </TourProvider>
                  </ModalProvider>
                </LocalModulesProvider>
              </InventoryProvider>
            </AppProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
