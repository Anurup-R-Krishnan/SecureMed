/**
 * Colour palettes, sizing, and config for the infection tracking visualisation.
 */

export const NODE_COLORS: Record<string, string> = {
    Patient: '#3b82f6',
    Doctor: '#10b981',
    Room: '#f59e0b',
    Equipment: '#8b5cf6',
    Department: '#6b7280',
};

export const NODE_EMOJI: Record<string, string> = {
    Patient: '🧑',
    Doctor: '👨‍⚕️',
    Room: '🏥',
    Equipment: '⚙️',
    Department: '🏢',
};

export const REL_COLORS: Record<string, string> = {
    SAW: '#3b82f680',
    VISITED: '#f59e0b80',
    WORKED_IN: '#10b98180',
    USED_EQUIPMENT: '#8b5cf680',
    PART_OF: '#6b728040',
    BELONGS_TO: '#6b728040',
};

/** Node radius by type. */
export const NODE_RADIUS: Record<string, number> = {
    Patient: 14,
    Doctor: 14,
    Room: 10,
    Equipment: 10,
    Department: 18,
};

export const VECTOR_LABELS: Record<string, string> = {
    shared_room: 'Shared Room',
    shared_doctor: 'Shared Doctor',
    shared_equipment: 'Shared Equipment',
    indirect: 'Indirect Chain',
    unknown: 'Unknown',
};
