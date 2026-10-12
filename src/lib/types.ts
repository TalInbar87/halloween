export interface LatLng {
  lat: number;
  lng: number;
}

export interface House extends LatLng {
  id: string;
  address: string;
  apartment: string | null;
  floor: string | null;
  building_code: string | null;
  notes: string | null;
  created_at: string;
}

export interface NewHouse extends LatLng {
  address: string;
  apartment: string | null;
  floor: string | null;
  building_code: string | null;
  notes: string | null;
}
