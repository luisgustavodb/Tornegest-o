export type ItemType = 'usinagem' | 'caldeiraria';

export interface Item {
  id: string;
  folderId: string;
  name: string;
  type: ItemType;
  material: string;
  dimensions: string;
  quantity: number;
  photoUrl?: string;
  notes?: string;
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}

export interface PlasmaCalculation {
  id: string;
  sheetWidth: number;
  sheetHeight: number;
  partWidth: number;
  partHeight: number;
  margin: number;
  result?: {
    partsPerRow: number;
    partsPerCol: number;
    totalParts: number;
    efficiency: number;
    wastePercent: number;
    isRotated?: boolean;
  };
  createdAt: number;
}

export interface AppData {
  folders: Folder[];
  items: Item[];
  plasmaCalculations: PlasmaCalculation[];
  plasmaLife: PlasmaLife;
}

export interface PlasmaLife {
  id: string;
  nozzle: number;
  electrode: number;
  updatedAt: number;
}
