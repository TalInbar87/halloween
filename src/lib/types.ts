export interface LatLng {
  lat: number;
  lng: number;
}

export interface House extends LatLng {
  id: string;
  address: string;
  notes: string | null;
  created_at: string;
}

export interface NewHouse extends LatLng {
  address: string;
  notes: string | null;
}
