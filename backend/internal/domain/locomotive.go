package domain

type Locomotive struct {
	ID           int    `json:"id"`
	Number       string `json:"number"`
	Type         string `json:"type"` // cargo | passenger
	Model        string `json:"model"`
	PowerType    string `json:"power_type"` // diesel | electric
	Manufacturer string `json:"manufacturer"`
	YearBuilt    int    `json:"year_built"`
	Depot        string `json:"depot"`
	Status       string `json:"status"` // active | maintenance
}
