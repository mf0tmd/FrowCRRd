
export type AppView = 'MENU' | 'SETUP' | 'EDITOR' | 'SETTINGS' | 'RECENT' | 'EXAMPLES' | 'TUTORIAL' | 'DOCS';

export type EngineType = 'PHOENIX' | 'RAPTOR' | 'ION';

export interface LogicNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface ThrottlePoint {
  id: string;
  t: number;      // time in seconds
  v: number;      // throttle 0.0..1.0
}

export interface PitchPoint {
  id: string;
  t: number;
  v: number;      // angle in degrees
}

export interface EngineInstance {
  id: string;
  points: LogicNode[]; // Physical/Logic anchor points
  throttlePoints: ThrottlePoint[]; // Throttle schedule keyframes
}

export interface TankConfig {
  dryMass: number;
  fuelMass: number;
}

export interface EngineGroupConfig {
  engineType: EngineType;
  engineCount: number;
  thrust: number; // N
  massFlow: number; // kg/s
  engineMass: number; // kg
  instances: EngineInstance[];
}

export interface SeparationConfig {
  mode: 'time' | 'altitude' | 'fuel';
  value: number;
}

export interface StageConfig {
  id: number;
  structuralMass: number; // kg
  payloadMass: number; // kg
  diameter: number; // m
  separation: SeparationConfig;
  tank: TankConfig;
  engineGroup: EngineGroupConfig;
  
  // Compatibility fields (deprecated)
  tanks?: number;
  hasFuelTank?: boolean;
  fuelMass?: number;
  engineCount?: number;
  engineType?: EngineType;
  engineInstances?: EngineInstance[];
  fuelLevel?: number;
}

export interface SimulationSettings {
  eventDisplayMode: EventDisplayMode;
  dt: number; // sec
  tMax: number; // sec
  rocketMarkerScale: number; // UI scale multiplier for current rocket marker
  dragEnabled: boolean;
  parachuteEnabled: boolean;
  stopOnImpact: boolean;
  stopOnFuelDepleted: boolean;
}

export type EventDisplayMode = 'all' | 'important' | 'minimal';

export interface ParachuteConfig {
  id: string;
  mode: 'time' | 'altitude' | 'speed';
  isDrogue: boolean;
  area: number; // m^2
  start: number;
  end: number;
}

export interface RocketConfig {
  id: string;
  missionName: string;
  missionType: string;
  stages: StageConfig[];
  simulation: SimulationSettings;
  parachutes?: ParachuteConfig[];
  fairingMass: number;
  fairingSeparation: SeparationConfig;
  pitchProgram: PitchPoint[];
  pitchProgramEnabled: boolean;
}

export interface TelemetryPoint {
  t: number;
  altitude: number;
  downrange: number;
  vVert: number;
  vHor: number;
  vTotal: number;
  accel: number;
  mass: number;
  thrust: number;
  mach: number;
  pitch?: number;
}

export type SelectionType = 
  | { type: 'ROCKET' }
  | { type: 'PARACHUTES' }
  | { type: 'PARACHUTE', parachuteIdx: number }
  | { type: 'STAGE', stageIdx: number }
  | { type: 'TANK', stageIdx: number }
  | { type: 'ENGINE_GROUP', stageIdx: number }
  | { type: 'ENGINE_INSTANCE', stageIdx: number, engineIdx: number }
  | { type: 'LOGIC_NODE', stageIdx: number, engineIdx: number, nodeIdx: number }
  | { type: 'THROTTLE_POINT', stageIdx: number, engineIdx: number, pointIdx: number }
  | { type: 'PITCH_POINT', pointIdx: number }
  | { type: 'NONE' };
