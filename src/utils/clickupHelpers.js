/**
 * ClickUp API Helper Functions
 *
 * Utilities for fetching data from ClickUp API to populate settings
 */

/**
 * Fetch all available lists/projects from ClickUp
 * @param {string} apiKey - ClickUp API key
 * @param {string} teamId - ClickUp team ID
 * @returns {Promise<Array>} Array of lists with id, name, task_count
 */
export const fetchClickUpLists = async (apiKey, teamId) => {
  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/team/${teamId}/space`,
      {
        headers: { Authorization: apiKey }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Flatten spaces -> folders -> lists
    const allLists = [];

    data.spaces?.forEach(space => {
      // Add lists directly in space
      space.lists?.forEach(list => {
        allLists.push({
          id: list.id,
          name: list.name,
          task_count: list.task_count || 0,
          folder: null,
          space: space.name
        });
      });

      // Add lists in folders
      space.folders?.forEach(folder => {
        folder.lists?.forEach(list => {
          allLists.push({
            id: list.id,
            name: list.name,
            task_count: list.task_count || 0,
            folder: folder.name,
            space: space.name
          });
        });
      });
    });

    return allLists;
  } catch (error) {
    console.error('Failed to fetch ClickUp lists:', error);
    throw error;
  }
};

/**
 * Fetch custom fields from a specific list
 * @param {string} apiKey - ClickUp API key
 * @param {string} listId - ClickUp list ID
 * @returns {Promise<Array>} Array of custom fields
 */
export const fetchCustomFields = async (apiKey, listId) => {
  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/field`,
      {
        headers: { Authorization: apiKey }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.fields || [];
  } catch (error) {
    console.error('Failed to fetch custom fields:', error);
    throw error;
  }
};

/**
 * Fetch all team members from ClickUp
 * @param {string} apiKey - ClickUp API key
 * @param {string} teamId - ClickUp team ID
 * @returns {Promise<Array>} Array of team members
 */
export const fetchTeamMembers = async (apiKey, teamId) => {
  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/team/${teamId}`,
      {
        headers: { Authorization: apiKey }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform to simpler format
    return data.team.members.map(member => ({
      id: member.user.id,
      username: member.user.username,
      email: member.user.email,
      color: member.user.color,
      initials: member.user.initials,
      profilePicture: member.user.profilePicture,
    }));
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    throw error;
  }
};

/**
 * Get list name by ID (helper for displaying tracked projects)
 * @param {string} apiKey - ClickUp API key
 * @param {string} listId - ClickUp list ID
 * @returns {Promise<string>} List name
 */
export const getListName = async (apiKey, listId) => {
  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}`,
      {
        headers: { Authorization: apiKey }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error('Failed to fetch list name:', error);
    return 'Unknown List';
  }
};
