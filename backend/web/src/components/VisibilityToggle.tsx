interface VisibilityToggleProps {
  riderVisible: boolean;
  referenceVisible: boolean;
  onRiderVisibilityChange: (visible: boolean) => void;
  onReferenceVisibilityChange: (visible: boolean) => void;
}

export function VisibilityToggle({
  riderVisible,
  referenceVisible,
  onRiderVisibilityChange,
  onReferenceVisibilityChange,
}: VisibilityToggleProps) {
  return (
    <div style={{ padding: '10px', background: '#222', color: '#fff' }}>
      <label>
        <input
          type="checkbox"
          checked={riderVisible}
          onChange={(e) => onRiderVisibilityChange(e.target.checked)}
        />
        Show Rider
      </label>
      <label style={{ marginLeft: '20px' }}>
        <input
          type="checkbox"
          checked={referenceVisible}
          onChange={(e) => onReferenceVisibilityChange(e.target.checked)}
        />
        Show Reference
      </label>
    </div>
  );
}
