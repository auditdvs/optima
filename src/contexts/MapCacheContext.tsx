import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface BranchGeo {
  name: string;
  region: string;
  coordinates: [number, number];
}

interface AuditedBranchGeo {
  name: string;
  region: string;
  coordinates: [number, number];
  auditType: string;
  auditDate: string;
  auditHistory: Array<{ date: string; type: string }>;
  hasFraud: boolean;
}

interface MapCacheContextType {
  branchesGeo: BranchGeo[];
  auditedBranchesGeo: AuditedBranchGeo[];
  isLoading: boolean;
  isLoaded: boolean;
  refreshMapData: () => Promise<void>;
  clearCache: () => void;
  lastUpdated: Date | null;
}

const MapCacheContext = createContext<MapCacheContextType | undefined>(undefined);

export function MapCacheProvider({ children }: { children: React.ReactNode }) {
  const [branchesGeo, setBranchesGeo] = useState<BranchGeo[]>([]);
  const [auditedBranchesGeo, setAuditedBranchesGeo] = useState<AuditedBranchGeo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasInitialized = useRef(false);

  const fetchBranchesGeoData = useCallback(async () => {
    try {
      const { data } = await supabase.from('branches_info').select('*');
      
      if (data) {
        const geoData = data
          .map((branch) => {
            let lat: number | null = null;
            let lng: number | null = null;

            if (branch.coordinates) {
              if (typeof branch.coordinates === 'string') {
                const match = branch.coordinates.match(/\(([^,]+),([^)]+)\)/);
                if (match) {
                  const val1 = parseFloat(match[1]);
                  const val2 = parseFloat(match[2]);
                  if (Math.abs(val1) > 90) {
                    lng = val1;
                    lat = val2;
                  } else {
                    lat = val1;
                    lng = val2;
                  }
                }
              } else if (typeof branch.coordinates === 'object') {
                lat = branch.coordinates.y || branch.coordinates.lat;
                lng = branch.coordinates.x || branch.coordinates.lng;
              }
            }

            if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
              return {
                name: branch.name,
                region: branch.region,
                coordinates: [lng, lat] as [number, number]
              };
            }
            return null;
          })
          .filter((item): item is BranchGeo => item !== null);
        
        setBranchesGeo(geoData);
        
        // Cache to sessionStorage
        sessionStorage.setItem('branchesGeo', JSON.stringify(geoData));
        sessionStorage.setItem('branchesGeo_timestamp', Date.now().toString());
      }
    } catch (error) {
      console.error('Error fetching branches geo:', error);
    }
  }, []);

  const fetchAuditedBranchesGeoData = useCallback(async () => {
    try {
      // Get audited branches from audit_master
      const { data: auditData, error: auditError } = await supabase
        .from('audit_master')
        .select('branch_name, audit_type, audit_start_date, audit_end_date')
        .order('audit_end_date', { ascending: false });
      
      if (auditError) throw auditError;

      // Get branches with coordinates from branches_info
      const { data: branchData, error: branchError } = await supabase
        .from('branches_info')
        .select('name, region, coordinates');
      
      if (branchError) throw branchError;

      if (!auditData || !branchData) return;

      // Create map of branch coordinates
      const branchCoordinatesMap: Record<string, { region: string; coordinates: [number, number] }> = {};
      
      branchData.forEach(branch => {
        let lat: number | null = null;
        let lng: number | null = null;

        if (branch.coordinates) {
          if (typeof branch.coordinates === 'string') {
            const match = branch.coordinates.match(/\(([^,]+),([^)]+)\)/);
            if (match) {
              const val1 = parseFloat(match[1]);
              const val2 = parseFloat(match[2]);
              if (Math.abs(val1) > 90) {
                lng = val1; lat = val2;
              } else {
                lat = val1; lng = val2;
              }
            }
          } else if (typeof branch.coordinates === 'object') {
            lat = branch.coordinates.y || branch.coordinates.lat;
            lng = branch.coordinates.x || branch.coordinates.lng;
          }
        }

        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
          branchCoordinatesMap[branch.name.toLowerCase().trim()] = {
            region: branch.region,
            coordinates: [lng, lat]
          };
        }
      });

      // Create map of audited branches with their audit details
      const branchAuditMap: Record<string, { 
        latestAudit: { type: string; date: string }; 
        auditHistory: Array<{ date: string; type: string }>;
        hasFraud: boolean;
      }> = {};

      auditData.forEach(audit => {
        const branchKey = audit.branch_name.toLowerCase().trim();
        const auditInfo = {
          date: audit.audit_end_date,
          type: audit.audit_type
        };

        if (!branchAuditMap[branchKey]) {
          branchAuditMap[branchKey] = {
            latestAudit: auditInfo,
            auditHistory: [auditInfo],
            hasFraud: audit.audit_type === 'fraud'
          };
        } else {
          branchAuditMap[branchKey].auditHistory.push(auditInfo);
          if (audit.audit_type === 'fraud') {
            branchAuditMap[branchKey].hasFraud = true;
          }
          if (new Date(audit.audit_end_date) > new Date(branchAuditMap[branchKey].latestAudit.date)) {
            branchAuditMap[branchKey].latestAudit = auditInfo;
          }
        }
      });

      // Create geo data for map
      const geoData: AuditedBranchGeo[] = Object.entries(branchAuditMap)
        .filter(([branchName]) => branchCoordinatesMap[branchName])
        .map(([branchName, auditInfo]) => ({
          name: branchName,
          region: branchCoordinatesMap[branchName].region,
          coordinates: branchCoordinatesMap[branchName].coordinates,
          auditType: auditInfo.latestAudit.type,
          auditDate: auditInfo.latestAudit.date,
          auditHistory: auditInfo.auditHistory,
          hasFraud: auditInfo.hasFraud
        }));

      setAuditedBranchesGeo(geoData);
      
      // Cache to sessionStorage
      sessionStorage.setItem('auditedBranchesGeo', JSON.stringify(geoData));
      sessionStorage.setItem('auditedBranchesGeo_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Error fetching audited branches geo:', error);
    }
  }, []);

  const refreshMapData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchBranchesGeoData(),
      fetchAuditedBranchesGeoData()
    ]);
    setLastUpdated(new Date());
    setIsLoading(false);
    setIsLoaded(true);
  }, [fetchBranchesGeoData, fetchAuditedBranchesGeoData]);

  // Clear all cached map data
  const clearCache = useCallback(() => {
    // Clear sessionStorage
    sessionStorage.removeItem('branchesGeo');
    sessionStorage.removeItem('branchesGeo_timestamp');
    sessionStorage.removeItem('auditedBranchesGeo');
    sessionStorage.removeItem('auditedBranchesGeo_timestamp');
    
    // Reset all state
    setBranchesGeo([]);
    setAuditedBranchesGeo([]);
    setIsLoaded(false);
    setLastUpdated(null);
    
    console.log('🗑️ Map cache cleared');
  }, []);

  // Initialize map data on first load
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

    // Try to load from cache first
    const cachedBranchesGeo = sessionStorage.getItem('branchesGeo');
    const cachedAuditedGeo = sessionStorage.getItem('auditedBranchesGeo');
    const branchesTimestamp = sessionStorage.getItem('branchesGeo_timestamp');
    const auditedTimestamp = sessionStorage.getItem('auditedBranchesGeo_timestamp');

    const now = Date.now();
    const branchesAge = branchesTimestamp ? now - parseInt(branchesTimestamp) : Infinity;
    const auditedAge = auditedTimestamp ? now - parseInt(auditedTimestamp) : Infinity;

    // If cache is valid (less than 30 minutes old), use it
    if (cachedBranchesGeo && cachedAuditedGeo && branchesAge < CACHE_DURATION && auditedAge < CACHE_DURATION) {
      try {
        setBranchesGeo(JSON.parse(cachedBranchesGeo));
        setAuditedBranchesGeo(JSON.parse(cachedAuditedGeo));
        setLastUpdated(new Date(Math.max(parseInt(branchesTimestamp!), parseInt(auditedTimestamp!))));
        setIsLoaded(true);
        console.log('🗺️ Map data loaded from cache');
        return;
      } catch (e) {
        console.error('Error parsing cached map data:', e);
      }
    }

    // Otherwise fetch fresh data
    console.log('🗺️ Fetching fresh map data...');
    refreshMapData();
  }, [refreshMapData]);

  return (
    <MapCacheContext.Provider value={{
      branchesGeo,
      auditedBranchesGeo,
      isLoading,
      isLoaded,
      refreshMapData,
      clearCache,
      lastUpdated
    }}>
      {children}
    </MapCacheContext.Provider>
  );
}

export function useMapCache() {
  const context = useContext(MapCacheContext);
  if (context === undefined) {
    throw new Error('useMapCache must be used within a MapCacheProvider');
  }
  return context;
}
