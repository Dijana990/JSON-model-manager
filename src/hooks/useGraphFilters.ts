import { useMemo } from 'react';
import type { GraphData } from '../types';
import { filterFirewallsGraph } from '../graphModes/firewalls';
import { filterDataservicesGraph } from '../graphModes/dataservices';
import { filterCredentialsGraph } from '../graphModes/credentials';
import { filterLandscapeGraph } from '../graphModes/landscape';

/**
 * Hook: useGraphFilters
 * ----------------------
 * Vraća filtrirane nodeove i edgeove ovisno o viewMode, selectedGroup i selectedTypes.
 *
 * @param preparedData - pripremljeni graph podaci
 * @param inputJson - originalni JSON input
 * @param viewMode - trenutno odabrani prikaz
 * @param selectedGroup - trenutno odabrana grupa
 * @param selectedTypes - trenutno odabrani tipovi čvorova
 * @returns GraphData - filtrirani nodes i edges
 */
export function useGraphFilters(
  preparedData: GraphData,
  inputJson: any,
  viewMode: string,
  selectedGroup: string,
  selectedTypes: Set<string>
): GraphData {
  return useMemo(() => {
    if (viewMode === 'firewalls') {
      return filterFirewallsGraph(preparedData, inputJson, selectedGroup, selectedTypes);
    } else if (viewMode === 'dataservices') {
      return filterDataservicesGraph(inputJson, selectedGroup, selectedTypes);
    } else if (viewMode === 'credentials') {
      return filterCredentialsGraph(inputJson, selectedGroup, selectedTypes);
    } else {
      return filterLandscapeGraph(preparedData, selectedGroup, selectedTypes);
    }
  }, [preparedData, inputJson, viewMode, selectedGroup, selectedTypes]);
}
