/**
 * EarthFlightPlot.tsx
 * A high-performance, zoomable 2D trajectory plot for spaceflight simulation.
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';

// --- Types ---

export interface TrajectoryPoint {
  x: number; // Downrange in meters
  y: number; // Altitude in meters
  headingDeg?: number; // Heading angle in degrees (0=right, 90=up)
}

export type FlightEventType = 'launch' | 'apoapsis' | 'landing' | 'burnout' | 'parachute' | 'stage-separation' | 'secondary';
export type FlightEventPriority = 'primary' | 'secondary';
export type FlightEventImportance = 'high' | 'medium' | 'low';
export type EventDisplayMode = 'all' | 'important' | 'minimal';
export type PlotLanguage = 'ru' | 'en';

export interface FlightEventMarker {
  id: string;
  x: number; // Downrange in meters
  y: number; // Altitude in meters
  t: number; // Time in seconds
  title?: string;
  value?: string;
  type?: FlightEventType;
  priority?: FlightEventPriority;
  importance?: FlightEventImportance;
  label?: string; // Backward compatibility fallback
}

export interface EarthFlightPlotProps {
  trajectoryPoints: TrajectoryPoint[];
  eventMarkers?: FlightEventMarker[];
  currentPoint?: TrajectoryPoint | null;
  rocketMarkerScale?: number;
  language?: PlotLanguage;
  width?: number;
  height?: number;
  centerXAtT0?: boolean;
  downrangeAtT0?: number;
  initialZoom?: number; // pixels per meter
  initialCenterWorld?: { x: number; y: number };
  showGrid?: boolean;
  showPoints?: boolean;
  showEventMarkers?: boolean;
  eventDisplayMode?: EventDisplayMode;
  highlightMaxAltitude?: boolean;
  showApoapsisLabel?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onTransformChange?: (t: { scale: number; panX: number; panY: number }) => void;
}

// --- Helper Functions ---

/**
 * Finds a "nice" step size (1, 2, 5 * 10^n) for grid lines.
 */
function getNiceStep(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / Math.pow(10, exponent);
  let niceFraction: number;

  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * Math.pow(10, exponent);
}

/**
 * Formats distance strictly in meters.
 */
function formatDistance(meters: number, language: PlotLanguage = 'en'): string {
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const unit = language === 'ru' ? '\u043c' : 'm';
  return `${Math.round(meters).toLocaleString(locale)} ${unit}`;
}

function formatCompactDistance(meters: number, language: PlotLanguage = 'en'): string {
  const absMeters = Math.abs(meters);
  const kmUnit = language === 'ru' ? '\u043a\u043c' : 'km';
  const mUnit = language === 'ru' ? '\u043c' : 'm';
  if (absMeters >= 1000) {
    return `${(meters / 1000).toFixed(1)} ${kmUnit}`;
  }
  return `${Math.round(meters)} ${mUnit}`;
}

function normalizeAngleDegrees(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return `rgba(255,255,255,${alpha})`;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type MarkerVisualStyle = {
  color: string;
  lineOpacity: number;
  lineWidth: number;
  pointRadius: number;
};

type NormalizedEventMarker = FlightEventMarker & {
  title: string;
  value?: string;
  type: FlightEventType;
  priority: FlightEventPriority;
  importance: FlightEventImportance;
  x: number;
  y: number;
  t: number;
};

type RenderedEventMarker = NormalizedEventMarker & {
  sx: number;
  sy: number;
  lane: number;
  labelVisible: boolean;
  lineVisible: boolean;
  tooltipTitle: string;
  tooltipValue?: string;
  tooltipTimeText: string;
  labelX: number;
  labelY: number;
  labelWidth: number;
  labelHeight: number;
  style: MarkerVisualStyle;
};

const EVENT_STYLE_MAP: Record<FlightEventType, MarkerVisualStyle> = {
  launch: { color: '#22c55e', lineOpacity: 0.35, lineWidth: 1.2, pointRadius: 4.2 },
  apoapsis: { color: '#ef4444', lineOpacity: 0.68, lineWidth: 1.8, pointRadius: 5.4 },
  landing: { color: '#f59e0b', lineOpacity: 0.68, lineWidth: 1.8, pointRadius: 5.2 },
  burnout: { color: '#f97316', lineOpacity: 0.38, lineWidth: 1.25, pointRadius: 4.3 },
  parachute: { color: '#2dd4bf', lineOpacity: 0.34, lineWidth: 1.2, pointRadius: 4.1 },
  'stage-separation': { color: '#a78bfa', lineOpacity: 0.46, lineWidth: 1.4, pointRadius: 4.5 },
  secondary: { color: '#93c5fd', lineOpacity: 0.28, lineWidth: 1.1, pointRadius: 3.8 },
};

const tooltipI18n: Record<PlotLanguage, { value: string; time: string; event: string; launchSite: string }> = {
  en: {
    value: 'Value',
    time: 'Time',
    event: 'Event',
    launchSite: 'LAUNCH SITE',
  },
  ru: {
    value: '\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435',
    time: '\u0412\u0440\u0435\u043c\u044f',
    event: '\u0421\u043e\u0431\u044b\u0442\u0438\u0435',
    launchSite: '\u0421\u0422\u0410\u0420\u0422',
  },
};

const eventTypeTitleI18n: Record<PlotLanguage, Partial<Record<FlightEventType, string>>> = {
  en: {
    launch: 'Launch',
    apoapsis: 'Apoapsis',
    landing: 'Landing',
    burnout: 'Motor Burnout',
    parachute: 'Parachute Deploy',
    'stage-separation': 'Stage Separation',
  },
  ru: {
    launch: '\u0421\u0442\u0430\u0440\u0442',
    apoapsis: '\u0410\u043f\u043e\u0433\u0435\u0439',
    landing: '\u041f\u043e\u0441\u0430\u0434\u043a\u0430',
    burnout: '\u0412\u044b\u0433\u043e\u0440\u0430\u043d\u0438\u0435 \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043b\u044f',
    parachute: '\u0412\u044b\u0431\u0440\u043e\u0441 \u043f\u0430\u0440\u0430\u0448\u044e\u0442\u0430',
    'stage-separation': '\u041e\u0442\u0434\u0435\u043b\u0435\u043d\u0438\u0435 \u0441\u0442\u0443\u043f\u0435\u043d\u0438',
  },
};

const overlayStatsI18n: Record<PlotLanguage, {
  scale: string;
  points: string;
  events: string;
  altitude: string;
  downrange: string;
  heading: string;
}> = {
  en: {
    scale: 'SCALE',
    points: 'POINTS',
    events: 'EVENTS',
    altitude: 'ALTITUDE',
    downrange: 'DOWNRANGE',
    heading: 'HEADING',
  },
  ru: {
    scale: '\u041c\u0410\u0421\u0428\u0422\u0410\u0411',
    points: '\u0422\u041e\u0427\u041a\u0418',
    events: '\u0421\u041e\u0411\u042b\u0422\u0418\u042f',
    altitude: '\u0412\u042b\u0421\u041e\u0422\u0410',
    downrange: '\u0414\u0410\u041b\u042c\u041d\u041e\u0421\u0422\u042c',
    heading: '\u041a\u0423\u0420\u0421',
  },
};

const eventTitleExactRu: Record<string, string> = {
  'Simulation complete': '\u0421\u0438\u043c\u0443\u043b\u044f\u0446\u0438\u044f \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430',
};

function resolvePlotLanguage(language?: PlotLanguage): PlotLanguage {
  if (language === 'ru' || language === 'en') {
    return language;
  }

  try {
    const stored = localStorage.getItem('app_lang');
    return stored === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

function localizeEventTitle(rawTitle: string | undefined, type: FlightEventType, language: PlotLanguage): string {
  const fallback = tooltipI18n[language].event;
  const cleanTitle = (rawTitle || '').trim();
  if (language === 'en') {
    return cleanTitle || eventTypeTitleI18n.en[type] || fallback;
  }

  if (cleanTitle && eventTitleExactRu[cleanTitle]) {
    return eventTitleExactRu[cleanTitle];
  }

  return eventTypeTitleI18n.ru[type] || cleanTitle || fallback;
}

function resolveEventStyle(type: FlightEventType, priority: FlightEventPriority): MarkerVisualStyle {
  const base = EVENT_STYLE_MAP[type] || EVENT_STYLE_MAP.secondary;
  if (priority === 'primary') {
    return {
      ...base,
      lineOpacity: Math.min(0.8, base.lineOpacity + 0.15),
      lineWidth: Math.max(base.lineWidth, 1.6),
      pointRadius: Math.max(base.pointRadius, 5.0),
    };
  }
  return base;
}

const importanceRank: Record<FlightEventImportance, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

type RectBox = { x: number; y: number; w: number; h: number };

function isLabelOverlap(a: RectBox, b: RectBox, padding = 4): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

function overlapArea(a: RectBox, b: RectBox): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function getVisibleMarkers(markers: NormalizedEventMarker[], mode: EventDisplayMode): NormalizedEventMarker[] {
  if (mode === 'all' || mode === 'minimal') {
    return markers;
  }

  return markers.filter((marker) =>
    marker.importance === 'high'
    || marker.type === 'launch'
    || marker.type === 'apoapsis'
    || marker.type === 'landing'
    || marker.type === 'stage-separation'
  );
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

interface TrajectoryEventMarkerGlyphProps {
  marker: RenderedEventMarker;
  groundY: number;
  hovered: boolean;
  dimmed: boolean;
  hideLabelWhenHovered?: boolean;
  onHover: (id: string | null) => void;
}

const TrajectoryEventMarkerGlyph: React.FC<TrajectoryEventMarkerGlyphProps> = ({
  marker,
  groundY,
  hovered,
  dimmed,
  hideLabelWhenHovered = false,
  onHover,
}) => {
  const gradientId = `event-line-${marker.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const desiredAxisY = Number.isFinite(groundY) ? groundY : marker.sy + 160;
  const maxLineLength = marker.priority === 'primary' ? 280 : 180;
  const deltaToAxis = desiredAxisY - marker.sy;
  const lineTargetY = Math.abs(deltaToAxis) > maxLineLength
    ? marker.sy + Math.sign(deltaToAxis) * maxLineLength
    : desiredAxisY;
  const lineStartY = Math.min(marker.sy, lineTargetY);
  const lineEndY = Math.max(marker.sy, lineTargetY);
  const lineVisible = marker.lineVisible && Math.abs(lineEndY - lineStartY) > 2;
  const lineOpacity = hovered ? Math.min(0.9, marker.style.lineOpacity + 0.25) : marker.style.lineOpacity;
  const title = marker.title;
  const value = marker.value || '';
  const hitRadius = Math.max(marker.style.pointRadius + 7, 10);
  const outerPointRadius = hovered ? marker.style.pointRadius + 1.5 : marker.style.pointRadius;
  const innerPointRadius = hovered
    ? Math.max(1.8, marker.style.pointRadius * 0.62)
    : Math.max(1.6, marker.style.pointRadius * 0.5);

  return (
    <g
      style={{
        pointerEvents: 'none',
        opacity: dimmed ? 0.4 : 1,
        transition: 'opacity 120ms ease-out',
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1={lineStartY} x2="0" y2={lineEndY} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={hexToRgba(marker.style.color, lineOpacity * 0.1)} />
          <stop offset="50%" stopColor={hexToRgba(marker.style.color, lineOpacity)} />
          <stop offset="100%" stopColor={hexToRgba(marker.style.color, lineOpacity * 0.1)} />
        </linearGradient>
      </defs>

      {lineVisible && (
        <line
          x1={marker.sx}
          y1={lineStartY}
          x2={marker.sx}
          y2={lineEndY}
          stroke={`url(#${gradientId})`}
          strokeWidth={hovered ? marker.style.lineWidth + 0.5 : marker.style.lineWidth}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {hovered && (
        <circle
          cx={marker.sx}
          cy={marker.sy}
          r={marker.style.pointRadius + 4}
          fill={hexToRgba(marker.style.color, 0.14)}
          stroke={hexToRgba(marker.style.color, 0.28)}
          strokeWidth="1.2"
          style={{ pointerEvents: 'none' }}
        />
      )}

      <circle
        cx={marker.sx}
        cy={marker.sy}
        r={outerPointRadius}
        fill="#0b1220"
        stroke={marker.style.color}
        strokeWidth={hovered ? 2.2 : 1.5}
        style={{ pointerEvents: 'none' }}
      />
      <circle
        cx={marker.sx}
        cy={marker.sy}
        r={innerPointRadius}
        fill={marker.style.color}
        style={{ pointerEvents: 'none' }}
      />

      {/* Hover/click hit zone bound only to marker point */}
      <circle
        cx={marker.sx}
        cy={marker.sy}
        r={hitRadius}
        fill="transparent"
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={() => onHover(marker.id)}
        onMouseLeave={() => onHover(null)}
        onPointerDown={(event) => event.stopPropagation()}
      />

      {marker.labelVisible && !(hideLabelWhenHovered && hovered) && (
        <g
          transform={`translate(${marker.labelX}, ${marker.labelY})`}
          style={{ pointerEvents: 'auto' }}
          onMouseEnter={() => onHover(marker.id)}
          onMouseLeave={() => onHover(null)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <rect
            width={marker.labelWidth}
            height={marker.labelHeight}
            rx="6"
            fill={hexToRgba('#0b1220', hovered ? 0.94 : 0.9)}
            stroke={hexToRgba(marker.style.color, hovered ? 0.88 : 0.52)}
            strokeWidth={hovered ? 1.1 : 0.9}
          />
          <text
            x="7"
            y={value ? 12 : 13}
            fill={marker.style.color}
            fontSize="9"
            fontWeight="700"
            className="font-mono"
          >
            {title}
          </text>
          {value && (
            <text
              x="7"
              y="23"
              fill="#e5e7eb"
              fontSize="8.5"
              fontWeight="600"
              className="font-mono"
            >
              {value}
            </text>
          )}
        </g>
      )}
    </g>
  );
};

interface EventTooltipCardProps {
  marker: RenderedEventMarker;
  x: number;
  y: number;
  language: PlotLanguage;
  withGrowAnimation?: boolean;
}

const EventTooltipCard: React.FC<EventTooltipCardProps> = ({ marker, x, y, language, withGrowAnimation = false }) => {
  const i18n = tooltipI18n[language];

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed z-[9999] pointer-events-none" style={{ left: x, top: y }}>
      {withGrowAnimation && (
        <style>{`
          @keyframes markerCardGrow {
            0% { transform: scale(0.92); opacity: 0.86; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      )}
      <div
        className="rounded-md border px-2.5 py-2 bg-[#0b1220]/97 backdrop-blur-sm shadow-[0_10px_32px_rgba(0,0,0,0.38)]"
        style={{
          borderColor: hexToRgba(marker.style.color, 0.68),
          maxWidth: 200,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          animation: withGrowAnimation ? 'markerCardGrow 160ms ease-out' : undefined,
          transformOrigin: 'top left',
        }}
      >
        <div className="text-[11px] font-black tracking-[0.04em]" style={{ color: marker.style.color }}>
          {marker.tooltipTitle}
        </div>
        {marker.tooltipValue && (
          <div className="mt-1 text-[10px] text-gray-200">
            <span className="text-gray-400">{i18n.value}: </span>
            <span>{marker.tooltipValue}</span>
          </div>
        )}
        <div className="mt-1 text-[10px] text-gray-300">
          <span className="text-gray-400">{i18n.time}: </span>
          <span>{marker.tooltipTimeText}</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- Component ---

export const EarthFlightPlot: React.FC<EarthFlightPlotProps> = ({
  trajectoryPoints,
  eventMarkers = [],
  currentPoint = null,
  rocketMarkerScale = 1,
  language,
  width: propsWidth,
  height: propsHeight,
  centerXAtT0 = false,
  downrangeAtT0 = 0,
  initialZoom = 0.001, // 1px = 1km default
  initialCenterWorld = { x: 50000, y: 25000 },
  showGrid = true,
  showPoints = false,
  showEventMarkers = true,
  eventDisplayMode = 'all' as EventDisplayMode,
  highlightMaxAltitude = true,
  showApoapsisLabel = true,
  minZoom = 1e-7,
  maxZoom = 10,
  onTransformChange,
}) => {
  // Container sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: propsWidth || 0, height: propsHeight || 0 });

  useEffect(() => {
    if (propsWidth && propsHeight) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({
          width: propsWidth || entry.contentRect.width,
          height: propsHeight || entry.contentRect.height,
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [propsWidth, propsHeight]);

  const { width, height } = dims;
  const locale = useMemo(() => resolvePlotLanguage(language), [language]);

  const normalizedInitialZoom = useMemo(() => {
    if (!Number.isFinite(initialZoom) || initialZoom <= 0) {
      return minZoom;
    }
    return Math.min(maxZoom, Math.max(minZoom, initialZoom));
  }, [initialZoom, minZoom, maxZoom]);

  const normalizedRocketMarkerScale = useMemo(() => {
    if (!Number.isFinite(rocketMarkerScale) || rocketMarkerScale <= 0) {
      return 1;
    }
    return Math.min(3, Math.max(0.4, rocketMarkerScale));
  }, [rocketMarkerScale]);

  // Transform State
  // scale: pixels per meter
  // panX/panY: screen offset in pixels
  const getInitialPan = useCallback(
    (viewWidth: number, viewHeight: number, zoom: number) => ({
      x: viewWidth / 2 - initialCenterWorld.x * zoom,
      y: viewHeight / 2 + initialCenterWorld.y * zoom, // SVG Y is down, altitude is up.
    }),
    [initialCenterWorld.x, initialCenterWorld.y]
  );

  const [scale, setScale] = useState(normalizedInitialZoom);
  const [pan, setPan] = useState(() => getInitialPan(propsWidth || 0, propsHeight || 0, normalizedInitialZoom));
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const hasUserInteractedRef = useRef(false);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (hasUserInteractedRef.current) return;
    setScale(normalizedInitialZoom);
  }, [normalizedInitialZoom]);

  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    if (hasUserInteractedRef.current) return;
    setPan(getInitialPan(width, height, scale));
  }, [width, height, scale, getInitialPan]);

  const emitTransformChange = useCallback(
    (nextScale: number, nextPan: { x: number; y: number }) => {
      onTransformChange?.({ scale: nextScale, panX: nextPan.x, panY: nextPan.y });
    },
    [onTransformChange]
  );

  // Derived Points (Adjusted for T0 centering)
  const processedPoints = useMemo(() => {
    const offset = centerXAtT0 ? downrangeAtT0 : 0;
    return trajectoryPoints.map((p) => ({
      x: p.x - offset,
      y: p.y,
    }));
  }, [trajectoryPoints, centerXAtT0, downrangeAtT0]);

  const processedCurrentPoint = useMemo(() => {
    if (!currentPoint) return null;
    const offset = centerXAtT0 ? downrangeAtT0 : 0;
    return {
      x: currentPoint.x - offset,
      y: currentPoint.y,
      headingDeg: currentPoint.headingDeg,
    };
  }, [currentPoint, centerXAtT0, downrangeAtT0]);

  const processedEventMarkers = useMemo<NormalizedEventMarker[]>(() => {
    const offset = centerXAtT0 ? downrangeAtT0 : 0;
    return eventMarkers
      .map((event) => {
        const normalizedType = event.type ?? 'secondary';
        const rawTitle = event.title || event.label || '';
        return {
          ...event,
          x: event.x - offset,
          y: Math.max(0, event.y),
          t: Number.isFinite(event.t) ? event.t : 0,
          type: normalizedType,
          priority: event.priority ?? ((event.type === 'apoapsis' || event.type === 'landing') ? 'primary' : 'secondary'),
          importance: event.importance
            ?? (event.type === 'apoapsis' || event.type === 'landing' ? 'high'
              : (event.type === 'launch' || event.type === 'stage-separation' ? 'medium' : 'low')),
          title: localizeEventTitle(rawTitle, normalizedType, locale),
          value: event.value || undefined,
        };
      })
      .filter((event) => Number.isFinite(event.x) && Number.isFinite(event.y));
  }, [eventMarkers, centerXAtT0, downrangeAtT0, locale]);

  const currentAltitude = useMemo(() => {
    if (!processedCurrentPoint) return 0;
    return Math.max(0, processedCurrentPoint.y);
  }, [processedCurrentPoint]);

  const currentDownrange = useMemo(() => {
    if (!processedCurrentPoint) return 0;
    return processedCurrentPoint.x;
  }, [processedCurrentPoint]);

  const currentMarkerRotation = useMemo(() => {
    const heading = processedCurrentPoint?.headingDeg;
    if (typeof heading !== 'number' || !Number.isFinite(heading)) {
      return 0;
    }
    return 90 - heading;
  }, [processedCurrentPoint]);

  const currentHeadingDeg = useMemo(() => {
    const heading = processedCurrentPoint?.headingDeg;
    if (typeof heading !== 'number' || !Number.isFinite(heading)) {
      return null;
    }
    return normalizeAngleDegrees(heading);
  }, [processedCurrentPoint]);

  const compassTicks = useMemo(() => {
    const stepDeg = 30;
    return Array.from({ length: Math.floor(360 / stepDeg) }, (_, idx) => idx * stepDeg);
  }, []);

  const compassNeedle = useMemo(() => {
    if (currentHeadingDeg === null) return null;

    const rad = currentHeadingDeg * Math.PI / 180;
    const ux = Math.cos(rad);
    const uy = -Math.sin(rad);

    const centerX = 60;
    const centerY = 60;
    const shaftLength = 34;
    const tipLength = 42;
    const headLength = 9;
    const headWidth = 4.5;

    const shaftEndX = centerX + shaftLength * ux;
    const shaftEndY = centerY + shaftLength * uy;
    const tipX = centerX + tipLength * ux;
    const tipY = centerY + tipLength * uy;
    const baseX = tipX - headLength * ux;
    const baseY = tipY - headLength * uy;
    const perpX = -uy;
    const perpY = ux;

    const leftX = baseX + headWidth * perpX;
    const leftY = baseY + headWidth * perpY;
    const rightX = baseX - headWidth * perpX;
    const rightY = baseY - headWidth * perpY;

    return {
      shaftEndX,
      shaftEndY,
      tipX,
      tipY,
      headPoints: `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`,
    };
  }, [currentHeadingDeg]);

  const maxAltPoint = useMemo(() => {
    if (processedPoints.length === 0) return null;
    return processedPoints.reduce((max, p) => (p.y > max.y ? p : max), processedPoints[0]);
  }, [processedPoints]);

  const hasApoapsisEvent = useMemo(
    () => processedEventMarkers.some((event) => event.type === 'apoapsis'),
    [processedEventMarkers]
  );

  const visibleEventMarkers = useMemo(
    () => getVisibleMarkers(processedEventMarkers, eventDisplayMode),
    [processedEventMarkers, eventDisplayMode]
  );

  // Coordinate Conversion
  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({
      x: wx * scale + pan.x,
      y: height - (wy * scale + pan.y),
    }),
    [scale, pan, height]
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - pan.x) / scale,
      y: (height - sy - pan.y) / scale,
    }),
    [scale, pan, height]
  );

  const currentMarkerScreen = useMemo(() => {
    if (!processedCurrentPoint) return null;
    return worldToScreen(processedCurrentPoint.x, processedCurrentPoint.y);
  }, [processedCurrentPoint, worldToScreen]);

  // Interaction Handlers
  const isEventOnNoPanControl = useCallback((target: EventTarget | null): boolean => {
    return target instanceof Element && target.closest('[data-no-pan="true"]') !== null;
  }, []);

  const markUserInteracted = useCallback(() => {
    hasUserInteractedRef.current = true;
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEventOnNoPanControl(e.target) || e.button !== 0) return;
    markUserInteracted();
    setIsPanning(true);
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPointerPosRef.current.x;
    const dy = e.clientY - lastPointerPosRef.current.y;

    setPan((prev) => {
      const nextPan = { x: prev.x + dx, y: prev.y - dy };
      emitTransformChange(scale, nextPan);
      return nextPan;
    });

    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    const target = e.currentTarget as Element;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
  };

  const zoomAtScreenPoint = useCallback(
    (screenX: number, screenY: number, zoomFactor: number) => {
      if (width <= 0 || height <= 0) return;
      const worldCursor = screenToWorld(screenX, screenY);
      const nextScale = Math.min(maxZoom, Math.max(minZoom, scale * zoomFactor));
      const nextPan = {
        x: screenX - worldCursor.x * nextScale,
        y: (height - screenY) - worldCursor.y * nextScale,
      };

      setScale(nextScale);
      setPan(nextPan);
      emitTransformChange(nextScale, nextPan);
    },
    [width, height, screenToWorld, maxZoom, minZoom, scale, emitTransformChange]
  );

  const handleWheel = (e: React.WheelEvent) => {
    if (isEventOnNoPanControl(e.target)) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    markUserInteracted();
    zoomAtScreenPoint(mouseX, mouseY, e.deltaY > 0 ? 0.9 : 1.1);
  };

  // Grid Calculation
  const gridData = useMemo(() => {
    if (!showGrid || width === 0 || height === 0) return null;

    const targetSpacingPx = 80;
    const worldStep = getNiceStep(targetSpacingPx / scale);
    
    const bounds = {
      minX: screenToWorld(0, height).x,
      maxX: screenToWorld(width, 0).x,
      minY: screenToWorld(0, height).y,
      maxY: screenToWorld(width, 0).y,
    };

    const startX = Math.floor(bounds.minX / worldStep) * worldStep;
    const endX = Math.ceil(bounds.maxX / worldStep) * worldStep;
    const startY = Math.floor(bounds.minY / worldStep) * worldStep;
    const endY = Math.ceil(bounds.maxY / worldStep) * worldStep;

    const verticalLines = [];
    for (let x = startX; x <= endX; x += worldStep) {
      const isMajor = Math.round(x / worldStep) % 5 === 0;
      verticalLines.push({ x, isMajor });
    }

    const horizontalLines = [];
    for (let y = startY; y <= endY; y += worldStep) {
      const isMajor = Math.round(y / worldStep) % 5 === 0;
      horizontalLines.push({ y, isMajor });
    }

    return { verticalLines, horizontalLines, worldStep };
  }, [showGrid, width, height, scale, screenToWorld]);

  // Trajectory Path
  const trajectoryPath = useMemo(() => {
    if (processedPoints.length < 2) return "";
    return processedPoints
      .map((p, i) => {
        const s = worldToScreen(p.x, p.y);
        return `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
      })
      .join(" ");
  }, [processedPoints, worldToScreen]);

  const renderedEventMarkers = useMemo<RenderedEventMarker[]>(() => {
    if (!showEventMarkers || visibleEventMarkers.length === 0 || width <= 0 || height <= 0) {
      return [];
    }

    const withScreenCoords = visibleEventMarkers
      .map((event) => {
        const screenPoint = worldToScreen(event.x, event.y);
        return {
          ...event,
          sx: screenPoint.x,
          sy: screenPoint.y,
        };
      })
      .filter((event) => event.sx >= -250 && event.sx <= width + 250);

    const sortedForPlacement = [...withScreenCoords].sort((a, b) => {
      const importanceDelta = importanceRank[b.importance] - importanceRank[a.importance];
      if (importanceDelta !== 0) return importanceDelta;
      return a.sx - b.sx || a.t - b.t;
    });

    const placedMarkers: RenderedEventMarker[] = [];
    const placedLabelBoxes: RectBox[] = [];

    sortedForPlacement.forEach((event) => {
      const style = resolveEventStyle(event.type, event.priority);
      const tooltipTitle = event.title;
      const tooltipValue = event.value || (event.type === 'apoapsis' ? formatCompactDistance(event.y, locale) : undefined);
      const tooltipTimeText = `T+${event.t.toFixed(1)}s`;
      const title = truncateLabel(tooltipTitle, 18);
      const value = tooltipValue ? truncateLabel(tooltipValue, 18) : '';
      const showLabel = eventDisplayMode !== 'minimal';
      const showLine = eventDisplayMode !== 'minimal';

      const titleWidth = Math.max(32, title.length * 5.6);
      const valueWidth = value ? value.length * 5.4 : 0;
      const labelWidth = showLabel ? Math.min(132, Math.max(64, Math.ceil(Math.max(titleWidth, valueWidth) + 14))) : 0;
      const labelHeight = showLabel ? (value ? 28 : 18) : 0;

      let labelVisible = showLabel;
      let labelX = event.sx + 8;
      let labelY = event.sy - labelHeight - 10;

      if (showLabel) {
        const candidateOffsets = [
          { dx: 8, dy: -labelHeight - 10 },
          { dx: -labelWidth - 8, dy: -labelHeight - 10 },
          { dx: 8, dy: 10 },
          { dx: -labelWidth - 8, dy: 10 },
        ];

        for (let step = 1; step <= 4; step += 1) {
          const delta = 10 + step * 8;
          candidateOffsets.push({ dx: 8, dy: -labelHeight - 10 - delta });
          candidateOffsets.push({ dx: -labelWidth - 8, dy: -labelHeight - 10 - delta });
          candidateOffsets.push({ dx: 8, dy: 10 + delta });
          candidateOffsets.push({ dx: -labelWidth - 8, dy: 10 + delta });
        }

        let selectedBox: RectBox | null = null;
        let selectedPosition: { x: number; y: number } | null = null;
        let bestOverlapBox: RectBox | null = null;
        let bestOverlapPosition: { x: number; y: number } | null = null;
        let bestOverlapScore = Number.POSITIVE_INFINITY;

        for (const offset of candidateOffsets) {
          let candidateX = event.sx + offset.dx;
          let candidateY = event.sy + offset.dy;

          candidateX = Math.max(6, Math.min(width - labelWidth - 6, candidateX));
          candidateY = Math.max(6, Math.min(height - labelHeight - 6, candidateY));

          const candidateBox: RectBox = { x: candidateX, y: candidateY, w: labelWidth, h: labelHeight };

          let hasCollision = false;
          let overlapScore = 0;
          for (const occupiedBox of placedLabelBoxes) {
            if (isLabelOverlap(candidateBox, occupiedBox, 3)) {
              hasCollision = true;
              overlapScore += overlapArea(candidateBox, occupiedBox);
            }
          }

          if (!hasCollision) {
            selectedBox = candidateBox;
            selectedPosition = { x: candidateX, y: candidateY };
            break;
          }

          if (overlapScore < bestOverlapScore) {
            bestOverlapScore = overlapScore;
            bestOverlapBox = candidateBox;
            bestOverlapPosition = { x: candidateX, y: candidateY };
          }
        }

        if (!selectedPosition || !selectedBox) {
          if (event.importance === 'high' && bestOverlapPosition && bestOverlapBox) {
            selectedPosition = bestOverlapPosition;
            selectedBox = bestOverlapBox;
          } else if (
            event.importance === 'medium'
            && bestOverlapPosition
            && bestOverlapBox
            && bestOverlapScore <= labelWidth * labelHeight * 0.18
          ) {
            selectedPosition = bestOverlapPosition;
            selectedBox = bestOverlapBox;
          } else {
            labelVisible = false;
          }
        }

        if (labelVisible && selectedPosition && selectedBox) {
          labelX = selectedPosition.x;
          labelY = selectedPosition.y;
          placedLabelBoxes.push(selectedBox);
        }
      }

      placedMarkers.push({
        ...event,
        title,
        value,
        lane: 0,
        labelVisible,
        lineVisible: showLine,
        tooltipTitle,
        tooltipValue,
        tooltipTimeText,
        labelX,
        labelY,
        labelWidth,
        labelHeight,
        style,
      });
    });

    return placedMarkers.sort((a, b) => a.t - b.t);
  }, [showEventMarkers, visibleEventMarkers, width, height, worldToScreen, eventDisplayMode, locale]);

  const hoveredMarker = useMemo(
    () => renderedEventMarkers.find((item) => item.id === hoveredMarkerId) || null,
    [renderedEventMarkers, hoveredMarkerId]
  );

  const hoveredTooltipPosition = useMemo(() => {
    if (!hoveredMarker || width <= 0 || height <= 0 || !containerRef.current) return null;
    const tooltipWidth = 200;
    const tooltipHeight = hoveredMarker.tooltipValue ? 86 : 64;
    const rect = containerRef.current.getBoundingClientRect();

    let viewportX = 0;
    let viewportY = 0;
    if (eventDisplayMode === 'minimal') {
      // Minimal mode uses point offset.
      viewportX = rect.left + hoveredMarker.sx + 12;
      viewportY = rect.top + hoveredMarker.sy - 12;
    } else {
      // In all/important, expand the same card in-place.
      viewportX = rect.left + hoveredMarker.labelX;
      viewportY = rect.top + hoveredMarker.labelY;
    }

    viewportX = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, viewportX));
    viewportY = Math.max(8, Math.min(window.innerHeight - tooltipHeight - 8, viewportY));

    return { x: viewportX, y: viewportY };
  }, [hoveredMarker, width, height, eventDisplayMode]);

  const groundY = useMemo(() => worldToScreen(0, 0).y, [worldToScreen]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0a0a0c] overflow-hidden select-none touch-none font-sans"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ cursor: isPanning ? 'grabbing' : 'crosshair' }}
    >
      <svg width={width} height={height} className="absolute inset-0">
        {/* Grid */}
        {gridData && (
          <g>
            {gridData.verticalLines.map((line) => {
              const s = worldToScreen(line.x, 0);
              return (
                <React.Fragment key={`v-${line.x}`}>
                  <line
                    x1={s.x} y1={0} x2={s.x} y2={height}
                    stroke={line.isMajor ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}
                    strokeWidth={line.isMajor ? 1.5 : 1}
                  />
                  {line.isMajor && (
                    <text
                      x={s.x + 4} y={height - 4}
                      fill="rgba(255,255,255,0.4)"
                      fontSize="10"
                      className="font-mono"
                    >
                      {formatDistance(line.x, locale)}
                    </text>
                  )}
                </React.Fragment>
              );
            })}
            {gridData.horizontalLines.map((line) => {
              const s = worldToScreen(0, line.y);
              return (
                <React.Fragment key={`h-${line.y}`}>
                  <line
                    x1={0} y1={s.y} x2={width} y2={s.y}
                    stroke={line.isMajor ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}
                    strokeWidth={line.isMajor ? 1.5 : 1}
                  />
                  {line.isMajor && (
                    <text
                      x={4} y={s.y - 4}
                      fill="rgba(255,255,255,0.4)"
                      fontSize="10"
                      className="font-mono"
                    >
                      {formatDistance(line.y, locale)}
                    </text>
                  )}
                </React.Fragment>
              );
            })}
          </g>
        )}

        {/* Ground Baseline */}
        <line
          x1={0} y1={groundY}
          x2={width} y2={groundY}
          stroke="#4ade80"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.6"
        />

        {/* Launch Site Marker */}
        <g transform={`translate(${worldToScreen(0, 0).x}, ${groundY})`}>
          <circle r="4" fill="#4ade80" />
          <text y="15" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="bold">{tooltipI18n[locale].launchSite}</text>
        </g>

        {/* Trajectory */}
        <path
          d={trajectoryPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Event Markers */}
        {renderedEventMarkers.map((event) => (
          <TrajectoryEventMarkerGlyph
            key={event.id}
            marker={event}
            groundY={groundY}
            hovered={hoveredMarkerId === event.id}
            dimmed={hoveredMarkerId !== null && hoveredMarkerId !== event.id}
            hideLabelWhenHovered={false}
            onHover={setHoveredMarkerId}
          />
        ))}

        {/* Points */}
        {showPoints && processedPoints.map((p, i) => {
          const s = worldToScreen(p.x, p.y);
          return <circle key={i} cx={s.x} cy={s.y} r="1.5" fill="#60a5fa" />;
        })}

        {/* Current Flight Marker */}
        {currentMarkerScreen && (
          <g transform={`translate(${currentMarkerScreen.x}, ${currentMarkerScreen.y})`}>
            <g transform={`rotate(${currentMarkerRotation}) scale(${normalizedRocketMarkerScale})`}>
              <path
                d="
                  M 0 -8
                  L 3.1 2.4
                  L 0 0.8
                  L -3.1 2.4
                  Z
                "
                fill="rgba(59,130,246,0.24)"
                stroke="#60a5fa"
                strokeWidth="1.5"
              />
              <circle
                cx="0"
                cy="-3.3"
                r="1.2"
                fill="#e0f2fe"
                stroke="#60a5fa"
                strokeWidth="0.6"
              />
            </g>
          </g>
        )}

        {/* Max Altitude Marker */}
        {highlightMaxAltitude && maxAltPoint && !hasApoapsisEvent && (
          <g transform={`translate(${worldToScreen(maxAltPoint.x, maxAltPoint.y).x}, ${worldToScreen(maxAltPoint.x, maxAltPoint.y).y})`}>
            <circle r="5" fill="none" stroke="#f87171" strokeWidth="2" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#f87171" strokeWidth="1" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#f87171" strokeWidth="1" />
            {showApoapsisLabel && (
              <>
                <text y="-14" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="700" className="font-mono">
                  {eventTypeTitleI18n[locale].apoapsis || 'Apoapsis'}
                </text>
                <text y="-26" textAnchor="middle" fill="#fef2f2" fontSize="10" fontWeight="600" className="font-mono">
                  {formatCompactDistance(maxAltPoint.y, locale)}
                </text>
              </>
            )}
          </g>
        )}
      </svg>

      {hoveredMarker && hoveredTooltipPosition && (
        <EventTooltipCard
          marker={hoveredMarker}
          x={hoveredTooltipPosition.x}
          y={hoveredTooltipPosition.y}
          language={locale}
          withGrowAnimation={eventDisplayMode !== 'minimal'}
        />
      )}

      {/* Overlay UI */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="flex items-start gap-3">
          <svg width="120" height="120" viewBox="0 0 120 120" className="block">
            <defs>
              <radialGradient id="compassFace" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(15,23,42,0.85)" />
                <stop offset="100%" stopColor="rgba(2,6,23,0.9)" />
              </radialGradient>
            </defs>

            <circle cx="60" cy="60" r="46" fill="url(#compassFace)" stroke="rgba(148,163,184,0.35)" strokeWidth="1.4" />
            <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />

            {compassTicks.map((deg) => {
              const rad = deg * Math.PI / 180;
              const isMajor = deg % 90 === 0;
              const outerR = 46;
              const innerR = isMajor ? 35 : 40;
              const x1 = 60 + outerR * Math.cos(rad);
              const y1 = 60 - outerR * Math.sin(rad);
              const x2 = 60 + innerR * Math.cos(rad);
              const y2 = 60 - innerR * Math.sin(rad);
              return (
                <line
                  key={`tick-${deg}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? 'rgba(226,232,240,0.9)' : 'rgba(148,163,184,0.45)'}
                  strokeWidth={isMajor ? 1.5 : 1}
                />
              );
            })}

            {[0, 90, 180, 270].map((deg) => {
              const rad = deg * Math.PI / 180;
              const labelR = 28;
              const x = 60 + labelR * Math.cos(rad);
              const y = 60 - labelR * Math.sin(rad) + 3.5;
              return (
                <text
                  key={`label-${deg}`}
                  x={x}
                  y={y}
                  fill="rgba(226,232,240,0.9)"
                  fontSize="9"
                  fontWeight="700"
                  textAnchor="middle"
                  className="font-mono"
                >{`${deg}\u00B0`}</text>
              );
            })}

            {compassNeedle && (
              <>
                <line
                  x1="60"
                  y1="60"
                  x2={compassNeedle.shaftEndX}
                  y2={compassNeedle.shaftEndY}
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <polygon
                  points={compassNeedle.headPoints}
                  fill="#0ea5e9"
                  stroke="#e0f2fe"
                  strokeWidth="0.7"
                />
              </>
            )}

            <circle cx="60" cy="60" r="3" fill="#f8fafc" stroke="rgba(14,165,233,0.7)" strokeWidth="1" />
          </svg>

          <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-lg text-white text-xs font-mono shadow-xl">
            <div className="flex justify-between gap-8 mb-1">
              <span className="text-white/50">{overlayStatsI18n[locale].scale}</span>
              <span>1 px = {formatDistance(1 / scale, locale)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-white/50">{overlayStatsI18n[locale].points}</span>
              <span>{trajectoryPoints.length}</span>
            </div>
            <div className="flex justify-between gap-8 mt-1">
              <span className="text-white/50">{overlayStatsI18n[locale].events}</span>
              <span>{visibleEventMarkers.length}</span>
            </div>
            <div className="flex justify-between gap-8 mt-1">
              <span className="text-white/50">{overlayStatsI18n[locale].altitude}</span>
              <span>{formatDistance(currentAltitude, locale)}</span>
            </div>
            <div className="flex justify-between gap-8 mt-1">
              <span className="text-white/50">{overlayStatsI18n[locale].downrange}</span>
              <span>{formatDistance(currentDownrange, locale)}</span>
            </div>
            <div className="flex justify-between gap-8 mt-1">
              <span className="text-white/50">{overlayStatsI18n[locale].heading}</span>
              <span>{currentHeadingDeg === null ? '--' : `${currentHeadingDeg.toFixed(1)}\u00B0`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
