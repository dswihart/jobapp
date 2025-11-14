/**
 * Job Sources Registry - Database Only
 * All sources are now managed in the database via user_job_sources table
 */

// Return empty arrays - all sources now come from database
export function getAllSources() { 
  return [] 
}

export function getEnabledSources() { 
  return [] 
}

export function getSourceByName() { 
  return undefined 
}

export function toggleSource() { 
  return false 
}

export function getSourceConfigs() { 
  return [] 
}

export async function loadDynamicSources() { 
  // No-op: sources loaded from database
}

export async function reloadSources() { 
  // No-op: sources loaded from database
}
