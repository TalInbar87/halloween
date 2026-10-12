import { useEffect, useState } from 'react';
import type { LatLng } from '../lib/types';

export type GeoState =
  | { status: 'idle' }
  | { status: 'unsupported' }
  | { status: 'locating' }
  | { status: 'denied' }
  | { status: 'error' }
  | { status: 'ok'; position: LatLng; accuracy: number };

/**
 * Live GPS position while `enabled`. Position stays in memory on this device only;
 * it is never sent anywhere.
 */
export function useGeolocation(enabled: boolean): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }
    setState((s) => (s.status === 'ok' ? s : { status: 'locating' }));
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setState({
          status: 'ok',
          position: { lat: p.coords.latitude, lng: p.coords.longitude },
          accuracy: p.coords.accuracy,
        }),
      (err) => setState({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return state;
}
