export interface LatLng {
  lat: number;
  lng: number;
}

export interface House extends LatLng {
  id: string;
  /** Display form "street number", built by the server from street + house_number. */
  address: string;
  street: string | null;
  house_number: string | null;
  apartment: string | null;
  floor: string | null;
  building_code: string | null;
  notes: string | null;
  created_at: string;
}

export interface NewHouse extends LatLng {
  street: string;
  house_number: string;
  apartment: string | null;
  floor: string | null;
  building_code: string | null;
  notes: string | null;
}
