import { FaFileExport } from 'react-icons/fa';
import Button from './Button';

export default function ExportButton({ onExport, label = 'Export CSV', loading = false, variant = 'outline', size = 'sm' }) {
  return (
    <Button variant={variant} size={size} onClick={onExport} loading={loading}>
      <FaFileExport size={12} /> {label}
    </Button>
  );
}
