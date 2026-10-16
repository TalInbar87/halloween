import { act, fireEvent, render } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { KeepScroll } from './KeepScroll';

afterEach(() => vi.useRealTimers());

function Popup({ version }: { version: number }) {
  return (
    <div className="leaflet-popup-content" data-testid="scroller">
      <KeepScroll watch={version}>
        <p>apartments v{version}</p>
      </KeepScroll>
    </div>
  );
}

describe('KeepScroll', () => {
  it('puts the list back where the kid was after the popup is redrawn', () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const { getByTestId, rerender } = render(<Popup version={1} />);
    const scroller = getByTestId('scroller');

    scroller.scrollTop = 180;
    fireEvent.scroll(scroller);

    rerender(<Popup version={2} />); // tapping "בטלו סימון" redraws the popup…
    scroller.scrollTop = 0; // …and Leaflet resets the scroll to the top

    act(() => vi.runAllTimers());
    expect(scroller.scrollTop).toBe(180);
  });

  it('does nothing when the kid had not scrolled', () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const { getByTestId, rerender } = render(<Popup version={1} />);
    rerender(<Popup version={2} />);
    act(() => vi.runAllTimers());
    expect(getByTestId('scroller').scrollTop).toBe(0);
  });

  it('works outside a popup without crashing', () => {
    expect(() =>
      render(
        <KeepScroll watch={1}>
          <span>x</span>
        </KeepScroll>,
      ),
    ).not.toThrow();
  });
});
