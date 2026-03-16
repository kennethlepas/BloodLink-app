export const KENYA_COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita–Taveta",
    "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
    "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
    "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
    "Samburu", "Trans-Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi",
    "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
    "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya",
    "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
].sort();

export const COUNTY_TOWNS: Record<string, string[]> = {
    "Mombasa": ["Mombasa City", "Nyali", "Changamwe", "Likoni", "Mtongwe"],
    "Nairobi": ["Nairobi City", "Westlands", "Kasarani", "Dagoretti", "Lang'ata", "Embakasi"],
    "Kisumu": ["Kisumu City", "Ahero", "Kondele", "Maseno", "Muhoroni"],
    "Nakuru": ["Nakuru City", "Naivasha", "Molo", "Gilgil", "Njoro"],
    "Uasin Gishu": ["Eldoret Town", "Burnt Forest", "Turbo", "Ziwa"],
    "Kiambu": ["Kiambu Town", "Thika", "Ruiru", "Limuru", "Kikuyu", "Gatundu"],
    "Machakos": ["Machakos Town", "Athi River", "Kangundo", "Tala", "Masii"],
    "Kajiado": ["Kajiado Town", "Ngong", "Kitengela", "Namanga", "Loitokitok"],
    "Mombasa City": ["Mombasa Town", "Mtwapa", "Mariakani"], // Handling sub-cities if needed
    // ... Add more as needed or use a generic list for others
};

// Fallback for counties with missing town data
export const getTownsByCounty = (county: string): string[] => {
    return COUNTY_TOWNS[county] || ["Main Town", "Other"];
};
