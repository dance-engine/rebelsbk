const superuser = "superadmin"

// These control access to various admin functionalities. Either direct path without querystring or regular expressions
const grantUsage = {
  "all-admins": ["/admin"], // Everyone gets this set
  "developer": ["#","/admin/users","/admin/stripe","/admin/import"],
  "content-manager": ['/admin/content'],
  "door-staff": ['/admin/ticketing','/admin/scan', '/admin/epos'],
  "event-manager": ['/admin/ticketing.*', '/admin/scan'] // Everything under ticketing
}

export const authUsage = (user,path) => {
  // Check could ever be allowed to do anything
  if(!authBasic(user)) return false
  
  const pathWithoutQueryString = path.split('?')[0]
  const roles = user.publicMetadata.roles
  // Superuser gets set to true always
  if(roles.includes(superuser)) return true
  // Check against all admins stuff
  if(grantUsage['all-admins'].includes(pathWithoutQueryString)) return true
  // check through roles to see if any of them allow access to path
  return roles.some((role) => {
    if(!grantUsage[role]) return false // Roles doesn't exist in permissions
    return grantUsage[role] && grantUsage[role].some((pattern) => { return pathWithoutQueryString == pattern || new RegExp(`^${pattern}$`).test(pathWithoutQueryString)}) 
  })
}

const authBasic = (user) => {
  // Make sure has metadata, admin and some roles 
  if(!user || !user.publicMetadata || !user.publicMetadata.admin || !user.publicMetadata.roles ) return false
  // Does it have roles?
  if(!Array.isArray(user.publicMetadata.roles)) return false
  return true
}