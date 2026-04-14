import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/employees?plant_id=1');
            setEmployees(res.data);
        } catch (error) {
            console.error("Erreur fetching data", error);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    return (
        <div style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>2. Résultats & Calculs (Database)</h3>
                <button 
                    onClick={fetchEmployees} 
                    style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 15px', cursor: 'pointer' }}
                >
                    🔄 Actualiser la liste
                </button>
            </div>

            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                        <th>Matricule</th>
                        <th>Nom Complet</th>
                        <th>Fonction</th>
                        <th>Salaire Base</th>
                        {/* Colonnes Calculées (En Vert) */}
                        <th style={{ backgroundColor: '#e6ffe6' }}>Salaire Brut</th>
                        <th style={{ backgroundColor: '#e6ffe6' }}>CNSS</th>
                        <th style={{ backgroundColor: '#d4edda', fontWeight: 'bold' }}>TOTAL COST</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.length === 0 ? (
                        <tr><td colSpan="7" style={{textAlign: 'center'}}>Aucune donnée. Faites un Upload.</td></tr>
                    ) : (
                        employees.map((emp) => (
                            <tr key={emp.id}>
                                <td>{emp.matricule}</td>
                                <td>{emp.full_name}</td>
                                <td>{emp.function}</td>
                                <td>{new Intl.NumberFormat('fr-MA').format(emp.base_salary)}</td>
                                
                                <td style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                                    {new Intl.NumberFormat('fr-MA').format(emp.gross_salary)}
                                </td>
                                <td>{new Intl.NumberFormat('fr-MA').format(emp.cnss_amount)}</td>
                                <td style={{ fontWeight: 'bold', color: 'green', fontSize: '1.1em' }}>
                                    {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(emp.total_company_cost)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeeList;