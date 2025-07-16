module.exports = {
  //only superadmin section
  //users
  "users.read": ["super_admin"],
  "users.write": ["super_admin"],
  "users.delete": ["super_admin"],
  "users.export": ["super_admin"],
  "members.export": ["super_admin", "admin", "member", "user"],
  "transactions.export": ["super_admin", "admin", "member", "user"],
 
  //packages
  "packages.read": ["super_admin"],
  "packages.write": ["super_admin"],
  "packages.delete": ["super_admin"],
  "subscriptions.write": ["super_admin"],
  //zones
  "zones.read": ["super_admin", "admin"],
  "zones.write": ["super_admin"],
  "zones.delete": ["super_admin"],
  //trainings
  "trainings.read": ["super_admin", "admin"],
  "trainings.write": ["super_admin", "admin"],
  "trainings.update": ["super_admin", "admin"],
  "trainings.delete": ["super_admin"],
  //categories
  "categories.read": ["super_admin", "admin"],
  "categories.write": ["super_admin", "admin"],
  "categories.update": ["super_admin", "admin"],
  "categories.delete": ["super_admin"],
  //messages
  "messages.read": ["super_admin", "admin", "member", "user"],
  "messages.write": ["super_admin", "admin", "member", "user"],
  "messages.update": ["super_admin", "admin", "member", "user"],
  "messages.delete": ["super_admin", "admin", "member", "user"],
  // requirements
  "requirements.read": ["super_admin", "admin", "member", "user"],
  "requirements.write": ["super_admin", "admin", "member", "user"],
  "requirements.delete": ["super_admin", "admin", "member", "user"],
  // one-to-ones
  "onetoones.read": ["super_admin", "admin", "member", "user"],
  "onetoones.write": ["super_admin", "admin", "member", "user"],
  "onetoones.delete": ["super_admin", "admin", "member", "user"],
 
   
 
 
  //roles
  "roles.read": ["super_admin"],
 
};
