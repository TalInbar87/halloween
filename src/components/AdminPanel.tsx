import { useState, type ReactNode } from 'react';

type Section = 'add' | 'remove';

interface Props {
  addForm: ReactNode;
  removeList: ReactNode;
  /** When set, shown instead of the add/remove sections. */
  editForm?: ReactNode;
  onClose: () => void;
  onLock: () => void;
}

export function AdminPanel({ addForm, removeList, editForm, onClose, onLock }: Props) {
  const [section, setSection] = useState<Section>('add');

  return (
    <div className="admin">
      <div className="admin-bar">
        <h2>ניהול בתים</h2>
        <div className="admin-bar-actions">
          <button type="button" className="btn secondary" onClick={onLock}>
            התנתק
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            חזרה למפה
          </button>
        </div>
      </div>

      {editForm ? (
        editForm
      ) : (
        <>
          <div className="view-toggle admin-switch" role="group" aria-label="פעולה">
            <button type="button" aria-pressed={section === 'add'} onClick={() => setSection('add')}>
              הוספת בית
            </button>
            <button type="button" aria-pressed={section === 'remove'} onClick={() => setSection('remove')}>
              הסרה ועריכה
            </button>
          </div>

          {section === 'add' ? addForm : removeList}
        </>
      )}
    </div>
  );
}
