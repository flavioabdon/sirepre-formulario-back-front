import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CheckCircle2, Circle, MapPin, Search, Filter, X, Check, Info, AlertTriangle } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Recinto {
    id: number;
    nombre: string;
    codigo: string;
    departamento: string;
    provincia: string;
    municipio: string;
    asiento: string;
    zona: string;
    longitud: number;
    latitud: number;
}

interface RecintoSelectorProps {
    onSelect: (field: string, value: number | null) => void;
    selected1: number | null;
    selected2?: number | null;
}

const ChangeView = ({ markers }: { markers: Recinto[] }) => {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.latitud, m.longitud]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [markers, map]);
    return null;
};

const RecintoSelector: React.FC<RecintoSelectorProps> = ({ onSelect, selected1, selected2 }) => {
    const [recintos, setRecintos] = useState<Recinto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [filterProvincia, setFilterProvincia] = useState('');
    const [filterMunicipio, setFilterMunicipio] = useState('');
    const activeTab = 'opcion1';

    const [pendingRecinto, setPendingRecinto] = useState<Recinto | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchRecintos = async () => {
            try {
                const response = await fetch('/api/postulantes/recintos/');
                if (!response.ok) throw new Error('Error al cargar recintos');
                const data = await response.json();
                setRecintos(data.filter((r: Recinto) => r.latitud && r.longitud));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchRecintos();
    }, []);

    useEffect(() => {
        if (filterMunicipio && mapRef.current) {
            mapRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [filterMunicipio]);

    const provincias = useMemo(() => {
        const unique = Array.from(new Set(recintos.map(r => r.provincia))).sort();
        return unique;
    }, [recintos]);

    const municipios = useMemo(() => {
        if (!filterProvincia) return [];
        const filtered = recintos.filter(r => r.provincia === filterProvincia);
        const unique = Array.from(new Set(filtered.map(r => r.municipio))).sort();
        return unique;
    }, [recintos, filterProvincia]);

    const markersToShow = useMemo(() => {
        let filtered = recintos;
        const isFiltered = filterMunicipio || (filterProvincia && !filterMunicipio) || searchTerm;

        if (isFiltered) {
            if (filterProvincia) filtered = filtered.filter(r => r.provincia === filterProvincia);
            if (filterMunicipio) filtered = filtered.filter(r => r.municipio === filterMunicipio);
            if (searchTerm) {
                filtered = filtered.filter(r =>
                    r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.codigo.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
        } else {
            filtered = [];
        }

        const finalSet = new Set(filtered);
        if (selected1) {
            const s1 = recintos.find(r => r.id === selected1);
            if (s1) finalSet.add(s1);
        }

        return Array.from(finalSet);
    }, [recintos, filterProvincia, filterMunicipio, searchTerm, selected1, selected2]);

    const handleMarkerClick = (recinto: Recinto) => {
        if (selected1 === recinto.id) {
            onSelect('recinto_primera_opcion', null);
        } else {
            setPendingRecinto(recinto);
        }
    };

    const confirmSelection = () => {
        if (!pendingRecinto) return;

        onSelect('recinto_primera_opcion', pendingRecinto.id);
        setFilterProvincia('');
        setFilterMunicipio('');
        setSearchTerm('');
        setPendingRecinto(null);
    };

    const getMarkerIcon = (recintoId: number) => {
        if (selected1 === recintoId) {
            return new L.Icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            });
        }
        return new L.Icon.Default();
    };

    if (loading) return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500 font-medium">Cargando recintos y mapas...</p>
    </div>;

    const sel1Data = recintos.find(r => r.id === selected1);

    return (
        <div className="space-y-6">
            {/* CONTENEDOR DE FILTROS Y RESUMEN (Integrado con Tabs) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">

                {/* GRILLA DE SELECCIÓN (ACTÚA COMO PESTAÑAS) */}
                {selected1 && (
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { id: selected1, data: sel1Data, label: 'Su Recinto de Votación', color: 'green', field: 'recinto_primera_opcion', tab: 'opcion1' as const },
                        ].map(item => (
                            <div
                                key={item.label}
                                className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden group border-green-500 bg-green-50/50 shadow-md ring-4 ring-green-100`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg transition-colors ${item.id ? `bg-green-500 text-white` : `bg-green-200 text-green-700`}`}>
                                            {item.id ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                        </div>
                                        <span className={`font-black text-sm tracking-tight text-green-700`}>
                                            {item.label}
                                        </span>
                                    </div>
                                </div>

                                {item.data && (
                                    <div className="bg-white p-3 rounded-lg border border-white/80 shadow-sm">
                                        <div className="flex items-start gap-2">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-gray-900 text-xs leading-tight">{item.data.nombre}</p>
                                                <div className="text-[10px] text-gray-500">
                                                    <p>{item.data.municipio}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            role="button"
                                            onClick={(e) => { e.stopPropagation(); onSelect(item.field, null); }}
                                            className="mt-2 text-[9px] font-bold text-red-500 flex items-center gap-1 hover:underline cursor-pointer"
                                        >
                                            <X className="w-3 h-3" /> Quitar
                                        </div>
                                    </div>
                                )}

                                {/* Barra indicadora inferior */}
                                <div className={`absolute bottom-0 left-0 h-1 w-full bg-green-500`} />
                            </div>
                        ))}
                    </div>
                )}

                {/* ÁREA DE BÚSQUEDA (Depende de la pestaña activa en los botones de arriba) */}
                <div className={`space-y-4 p-5 rounded-2xl border-2 transition-all ${activeTab === 'opcion1' ? 'border-red-100 bg-red-50/20' : 'border-green-100 bg-green-50/20'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className={`w-5 h-5 text-green-600`} />
                            <h4 className={`font-black uppercase text-xs tracking-widest text-green-700`}>
                                Busque su recinto electoral
                            </h4>
                        </div>
                        {searchTerm || filterProvincia || filterMunicipio ? (
                            <button
                                onClick={() => { setFilterProvincia(''); setFilterMunicipio(''); setSearchTerm(''); }}
                                className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Limpiar filtros
                            </button>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={filterProvincia}
                            onChange={(e) => { setFilterProvincia(e.target.value); setFilterMunicipio(''); }}
                            className={`w-full px-4 py-2.5 bg-white border rounded-xl outline-none transition-all focus:ring-2 focus:ring-green-500 border-green-200`}
                        >
                            <option value="">Seleccione Provincia...</option>
                            {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <select
                            value={filterMunicipio}
                            onChange={(e) => setFilterMunicipio(e.target.value)}
                            disabled={!filterProvincia}
                            className={`w-full px-4 py-2.5 bg-white border rounded-xl outline-none transition-all disabled:opacity-50 focus:ring-2 focus:ring-green-500 border-green-200`}
                        >
                            <option value="">Seleccione Municipio...</option>
                            {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="relative pt-2">
                        <Search className="absolute left-4 top-[1.65rem] w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="O busque por nombre de recinto o código..."
                            className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl outline-none transition-all focus:ring-2 focus:ring-green-500 border-green-200`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* El Mapa */}
            <div
                ref={mapRef}
                className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-gray-100 scroll-mt-20"
            >
                {!filterMunicipio && !searchTerm && !selected1 && (
                    <div className="absolute inset-0 z-[1001] bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-xs space-y-4">
                            <MapPin className="text-green-600 w-12 h-12 mx-auto" />
                            <p className="text-gray-700 font-medium">Seleccione una Provincia y Municipio arriba para comenzar.</p>
                        </div>
                    </div>
                )}

                {pendingRecinto && (
                    <div className="absolute inset-0 z-[1002] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="p-6 text-center space-y-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${activeTab === 'opcion1' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <div>
                                    <h5 className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-1">
                                        ¿Confirmar Recinto de Votación?
                                    </h5>
                                    <p className="text-xl font-black text-gray-900 leading-tight">
                                        {pendingRecinto.nombre}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {pendingRecinto.municipio}, {pendingRecinto.zona}
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setPendingRecinto(null)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all font-sans"
                                    >
                                        <X className="w-5 h-5" /> Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmSelection}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl shadow-lg transition-all ${activeTab === 'opcion1' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                                            }`}
                                    >
                                        <Check className="w-5 h-5" /> Seleccionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-[450px]">
                    <MapContainer center={[-16.500, -68.120]} zoom={12} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ChangeView markers={markersToShow} />
                        {markersToShow.map(recinto => (
                            <Marker
                                key={recinto.id}
                                position={[recinto.latitud, recinto.longitud]}
                                icon={getMarkerIcon(recinto.id)}
                                eventHandlers={{ click: () => handleMarkerClick(recinto) }}
                            >
                                <Popup>
                                    <div className="p-1 min-w-[140px]">
                                        <p className="font-bold text-gray-800 leading-tight">{recinto.nombre}</p>
                                        <p className="text-[10px] text-gray-500 mb-1">{recinto.codigo}</p>

                                        {selected1 === recinto.id && (
                                            <div
                                                role="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelect('recinto_primera_opcion', null);
                                                }}
                                                className="mt-2 text-[10px] font-bold text-red-600 flex items-center justify-center gap-1 hover:underline cursor-pointer bg-red-50 p-2 rounded-xl transition-all border border-red-100 uppercase tracking-tighter"
                                            >
                                                <X className="w-3 h-3" /> Quitar del Recinto
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default RecintoSelector;
