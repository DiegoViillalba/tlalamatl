// Planos de tres mercados públicos para el croquis. GENERADO por herramientas/planos.py (copiado de
// frontend/datos/planos.js); no se edita a mano.
// Real: contorno del edificio (OpenStreetMap) y datos del mercado (SEDECO).
// Ilustrativo: zonas por giro, pasillos, locatarios, contacto (5500xxxxxx, rango no asignado) e inventario.
import type { Plano } from './planos'

export const PLANOS: Record<string, Plano> = {
  "mp-77": {
    "id": "mp-77",
    "corto": "San Juan",
    "nombre": "Mercado San Juan Pugibet",
    "alcaldia": "Cuauhtémoc",
    "colonia": "Centro VIII",
    "ubicacion": "Enrnesto Pugibet, entre Luis Moya y Buen Tono",
    "locales": 361,
    "giro": "Abarrotes, Carnícos, Pescados y Mariscos, Frutas, Verduras, Semillas y Dulces",
    "anio": "1955",
    "lat": 19.430036,
    "lng": -99.144608,
    "osm": "way 1422386687",
    "contorno": [
      [113, 0.1],
      [112.7, 6.6],
      [111.1, 36.2],
      [110.7, 43.1],
      [49.9, 43.4],
      [0.1, 43.7],
      [0, 1.8],
      [92, 1.8],
      [91.7, 21.9],
      [103.5, 21.6],
      [103.7, 0]
    ],
    "ancho": 113,
    "alto": 43.7,
    "zonas": [
      { "nombre": "Frutas y verduras", "parte": 0.24 },
      { "nombre": "Carnes y aves", "parte": 0.26 },
      { "nombre": "Pescados y mariscos", "parte": 0.14 },
      { "nombre": "Quesos y salchichonería", "parte": 0.14 },
      { "nombre": "Abarrotes y especias", "parte": 0.12 },
      { "nombre": "Comida preparada", "parte": 0.1 }
    ],
    "localesDemo": [
      {
        "zona": "Carnes y aves",
        "puesto": "Carnes Finas Don Toño",
        "locatario": "Antonio Mejía",
        "horario": "7:00 a 17:00 h",
        "telefono": "5500000301",
        "whatsapp": "5500000301",
        "inventario": [
          { "producto": "Rib eye", "precio": 520, "unidad": "kg" },
          { "producto": "Arrachera", "precio": 380, "unidad": "kg" },
          { "producto": "Codorniz", "precio": 95, "unidad": "pieza" },
          { "producto": "Pato entero", "precio": 420, "unidad": "pieza" }
        ]
      },
      {
        "zona": "Carnes y aves",
        "puesto": "Aves de Corral La Estrella",
        "locatario": "María Elena Ruiz",
        "horario": "7:00 a 16:00 h",
        "telefono": "5500000302",
        "whatsapp": "5500000302",
        "inventario": [
          { "producto": "Pechuga de pollo", "precio": 125, "unidad": "kg" },
          { "producto": "Pollo entero", "precio": 72, "unidad": "kg" },
          { "producto": "Huevo de codorniz", "precio": 80, "unidad": "docena" }
        ]
      },
      {
        "zona": "Pescados y mariscos",
        "puesto": "Mariscos El Puerto de San Juan",
        "locatario": "Rogelio Campos",
        "horario": "6:30 a 16:00 h",
        "telefono": "5500000303",
        "whatsapp": "5500000303",
        "inventario": [
          { "producto": "Huachinango", "precio": 280, "unidad": "kg" },
          { "producto": "Camarón U15", "precio": 450, "unidad": "kg" },
          { "producto": "Pulpo", "precio": 320, "unidad": "kg" },
          { "producto": "Ostión", "precio": 160, "unidad": "docena" }
        ]
      },
      {
        "zona": "Quesos y salchichonería",
        "puesto": "Quesos y Carnes Frías Lupita",
        "locatario": "Guadalupe Hernández",
        "horario": "8:00 a 18:00 h",
        "telefono": "5500000304",
        "whatsapp": null,
        "inventario": [
          { "producto": "Queso Oaxaca", "precio": 160, "unidad": "kg" },
          { "producto": "Queso de cabra", "precio": 340, "unidad": "kg" },
          { "producto": "Jamón serrano", "precio": 780, "unidad": "kg" }
        ]
      },
      {
        "zona": "Frutas y verduras",
        "puesto": "Frutas Exóticas Doña Chela",
        "locatario": "Graciela Torres",
        "horario": "7:00 a 18:00 h",
        "telefono": "5500000305",
        "whatsapp": "5500000305",
        "inventario": [
          { "producto": "Pitahaya", "precio": 90, "unidad": "kg" },
          { "producto": "Mangostán", "precio": 260, "unidad": "kg" },
          { "producto": "Fresa", "precio": 70, "unidad": "kg" },
          { "producto": "Mango ataulfo", "precio": 45, "unidad": "kg" }
        ]
      },
      {
        "zona": "Frutas y verduras",
        "puesto": "Hortalizas Hermanos Pineda",
        "locatario": "Jorge Pineda",
        "horario": "7:00 a 17:00 h",
        "telefono": "5500000306",
        "whatsapp": "5500000306",
        "inventario": [
          { "producto": "Jitomate saladet", "precio": 30, "unidad": "kg" },
          { "producto": "Aguacate hass", "precio": 75, "unidad": "kg" },
          { "producto": "Hongo portobello", "precio": 140, "unidad": "kg" }
        ]
      },
      {
        "zona": "Abarrotes y especias",
        "puesto": "Especias del Mundo",
        "locatario": "Patricia Lozano",
        "horario": "8:00 a 18:00 h",
        "telefono": "5500000307",
        "whatsapp": "5500000307",
        "inventario": [
          { "producto": "Azafrán", "precio": 120, "unidad": "g" },
          { "producto": "Pimienta negra", "precio": 380, "unidad": "kg" },
          { "producto": "Chile guajillo", "precio": 170, "unidad": "kg" }
        ]
      },
      {
        "zona": "Comida preparada",
        "puesto": "Tortas y Bocadillos San Juan",
        "locatario": "Ernesto Valdez",
        "horario": "9:00 a 17:00 h",
        "telefono": "5500000308",
        "whatsapp": "5500000308",
        "inventario": [
          { "producto": "Bocadillo de jamón serrano", "precio": 120, "unidad": "pieza" },
          { "producto": "Torta de pierna", "precio": 75, "unidad": "pieza" }
        ]
      }
    ]
  },
  "mp-235": {
    "id": "mp-235",
    "corto": "Jamaica",
    "nombre": "Mercado Jamaica Nuevo",
    "alcaldia": "Venustiano Carranza",
    "colonia": "Jamaica",
    "ubicacion": "Congreso de la Union, entre Guillermo Prieto y Morelos",
    "locales": 1312,
    "giro": "Plantas, Flores y Peces de Ornato",
    "anio": "1957",
    "lat": 19.40775,
    "lng": -99.123057,
    "osm": "way 1164605686",
    "contorno": [
      [158.2, 0],
      [157.1, 60],
      [0.3, 60.1],
      [0, 0]
    ],
    "ancho": 158.2,
    "alto": 60.1,
    "zonas": [
      { "nombre": "Flores de corte", "parte": 0.38 },
      { "nombre": "Plantas de ornato", "parte": 0.2 },
      { "nombre": "Arreglos y coronas", "parte": 0.14 },
      { "nombre": "Macetas y jardinería", "parte": 0.08 },
      { "nombre": "Frutas y verduras", "parte": 0.12 },
      { "nombre": "Comida preparada", "parte": 0.08 }
    ],
    "localesDemo": [
      {
        "zona": "Flores de corte",
        "puesto": "Rosas Doña Carmen",
        "locatario": "Carmen Salinas",
        "horario": "6:00 a 19:00 h",
        "telefono": "5500000309",
        "whatsapp": "5500000309",
        "inventario": [
          { "producto": "Rosa roja", "precio": 180, "unidad": "paquete de 25" },
          { "producto": "Rosa blanca", "precio": 190, "unidad": "paquete de 25" },
          { "producto": "Gerbera", "precio": 120, "unidad": "paquete de 10" }
        ]
      },
      {
        "zona": "Flores de corte",
        "puesto": "Flores de Temporada Xóchitl",
        "locatario": "Xóchitl Ramírez",
        "horario": "6:00 a 19:00 h",
        "telefono": "5500000310",
        "whatsapp": "5500000310",
        "inventario": [
          { "producto": "Cempasúchil", "precio": 60, "unidad": "manojo" },
          { "producto": "Nube", "precio": 80, "unidad": "manojo" },
          { "producto": "Girasol", "precio": 150, "unidad": "paquete de 10" }
        ]
      },
      {
        "zona": "Flores de corte",
        "puesto": "Lilis y Alcatraces El Güero",
        "locatario": "Raúl Mendoza",
        "horario": "6:00 a 18:00 h",
        "telefono": "5500000311",
        "whatsapp": null,
        "inventario": [
          { "producto": "Alcatraz", "precio": 140, "unidad": "paquete de 12" },
          { "producto": "Lilium", "precio": 220, "unidad": "paquete de 10" },
          { "producto": "Tulipán", "precio": 350, "unidad": "paquete de 10" }
        ]
      },
      {
        "zona": "Plantas de ornato",
        "puesto": "Vivero Las Orquídeas",
        "locatario": "Lucía Ortega",
        "horario": "7:00 a 18:00 h",
        "telefono": "5500000312",
        "whatsapp": "5500000312",
        "inventario": [
          { "producto": "Orquídea phalaenopsis", "precio": 380, "unidad": "pieza" },
          { "producto": "Suculenta", "precio": 35, "unidad": "pieza" },
          { "producto": "Helecho", "precio": 90, "unidad": "pieza" }
        ]
      },
      {
        "zona": "Arreglos y coronas",
        "puesto": "Arreglos Florales Martínez",
        "locatario": "Sergio Martínez",
        "horario": "7:00 a 20:00 h",
        "telefono": "5500000313",
        "whatsapp": "5500000313",
        "inventario": [
          { "producto": "Arreglo de mesa", "precio": 450, "unidad": "pieza" },
          { "producto": "Ramo de novia", "precio": 1200, "unidad": "pieza" },
          { "producto": "Corona fúnebre", "precio": 1500, "unidad": "pieza" }
        ]
      },
      {
        "zona": "Macetas y jardinería",
        "puesto": "Barro y Macetas Tonalá",
        "locatario": "Juana Pérez",
        "horario": "8:00 a 18:00 h",
        "telefono": "5500000314",
        "whatsapp": "5500000314",
        "inventario": [
          { "producto": "Maceta de barro grande", "precio": 220, "unidad": "pieza" },
          { "producto": "Tierra preparada", "precio": 45, "unidad": "bulto" },
          { "producto": "Abono orgánico", "precio": 60, "unidad": "bulto" }
        ]
      },
      {
        "zona": "Frutas y verduras",
        "puesto": "Verduras Doña Rosa",
        "locatario": "Rosa Gutiérrez",
        "horario": "6:00 a 17:00 h",
        "telefono": "5500000315",
        "whatsapp": "5500000315",
        "inventario": [
          { "producto": "Cebolla blanca", "precio": 26, "unidad": "kg" },
          { "producto": "Chile serrano", "precio": 48, "unidad": "kg" },
          { "producto": "Limón", "precio": 34, "unidad": "kg" }
        ]
      },
      {
        "zona": "Comida preparada",
        "puesto": "Huaraches La Flor",
        "locatario": "Margarita León",
        "horario": "8:00 a 17:00 h",
        "telefono": "5500000316",
        "whatsapp": "5500000316",
        "inventario": [
          { "producto": "Huarache sencillo", "precio": 55, "unidad": "pieza" },
          { "producto": "Quesadilla", "precio": 35, "unidad": "pieza" },
          { "producto": "Agua de jamaica", "precio": 25, "unidad": "vaso" }
        ]
      }
    ]
  },
  "mp-89": {
    "id": "mp-89",
    "corto": "Coyoacán",
    "nombre": "Mercado Coyoacan",
    "alcaldia": "Coyoacán",
    "colonia": "Del Carmen",
    "ubicacion": "Xicotencatl, entre Malitzin y Allende",
    "locales": 464,
    "giro": "Comida Preparada y Otros",
    "anio": "1957",
    "lat": 19.352735,
    "lng": -99.161498,
    "osm": "way 96972452",
    "contorno": [
      [0.3, 0.4],
      [0, 80.7],
      [100.4, 80.7],
      [100.1, 0]
    ],
    "ancho": 100.4,
    "alto": 80.7,
    "zonas": [
      { "nombre": "Comida preparada", "parte": 0.26 },
      { "nombre": "Frutas y verduras", "parte": 0.2 },
      { "nombre": "Carnes y pollo", "parte": 0.14 },
      { "nombre": "Abarrotes y semillas", "parte": 0.1 },
      { "nombre": "Artesanía y juguetes", "parte": 0.16 },
      { "nombre": "Ropa y varios", "parte": 0.14 }
    ],
    "localesDemo": [
      {
        "zona": "Comida preparada",
        "puesto": "Tostadas Coyoacán",
        "locatario": "Elvira Castañeda",
        "horario": "10:00 a 19:00 h",
        "telefono": "5500000317",
        "whatsapp": "5500000317",
        "inventario": [
          { "producto": "Tostada de pata", "precio": 55, "unidad": "pieza" },
          { "producto": "Tostada de tinga", "precio": 50, "unidad": "pieza" },
          { "producto": "Tostada de ceviche", "precio": 70, "unidad": "pieza" }
        ]
      },
      {
        "zona": "Comida preparada",
        "puesto": "Quesadillas Doña Mago",
        "locatario": "Margarita Flores",
        "horario": "9:00 a 18:00 h",
        "telefono": "5500000318",
        "whatsapp": "5500000318",
        "inventario": [
          { "producto": "Quesadilla de flor de calabaza", "precio": 45, "unidad": "pieza" },
          { "producto": "Quesadilla de huitlacoche", "precio": 50, "unidad": "pieza" }
        ]
      },
      {
        "zona": "Frutas y verduras",
        "puesto": "Frutería La Güera",
        "locatario": "Silvia Moreno",
        "horario": "7:00 a 18:00 h",
        "telefono": "5500000319",
        "whatsapp": "5500000319",
        "inventario": [
          { "producto": "Mango ataulfo", "precio": 40, "unidad": "kg" },
          { "producto": "Fresa", "precio": 60, "unidad": "kg" },
          { "producto": "Piña miel", "precio": 35, "unidad": "pieza" },
          { "producto": "Aguacate hass", "precio": 70, "unidad": "kg" }
        ]
      },
      {
        "zona": "Carnes y pollo",
        "puesto": "Pollería San Lucas",
        "locatario": "Manuel Rivera",
        "horario": "7:00 a 16:00 h",
        "telefono": "5500000320",
        "whatsapp": null,
        "inventario": [
          { "producto": "Pechuga de pollo", "precio": 120, "unidad": "kg" },
          { "producto": "Pierna y muslo", "precio": 85, "unidad": "kg" },
          { "producto": "Huevo blanco", "precio": 48, "unidad": "kg" }
        ]
      },
      {
        "zona": "Abarrotes y semillas",
        "puesto": "Semillas y Chiles Doña Paz",
        "locatario": "Paz Domínguez",
        "horario": "8:00 a 18:00 h",
        "telefono": "5500000321",
        "whatsapp": "5500000321",
        "inventario": [
          { "producto": "Frijol negro", "precio": 34, "unidad": "kg" },
          { "producto": "Arroz", "precio": 28, "unidad": "kg" },
          { "producto": "Chile ancho", "precio": 185, "unidad": "kg" }
        ]
      },
      {
        "zona": "Artesanía y juguetes",
        "puesto": "Juguetes de Madera El Trompo",
        "locatario": "Luis Aguilar",
        "horario": "10:00 a 19:00 h",
        "telefono": "5500000322",
        "whatsapp": "5500000322",
        "inventario": [
          { "producto": "Trompo", "precio": 40, "unidad": "pieza" },
          { "producto": "Balero", "precio": 35, "unidad": "pieza" },
          { "producto": "Lotería", "precio": 90, "unidad": "pieza" }
        ]
      },
      {
        "zona": "Ropa y varios",
        "puesto": "Bordados de Oaxaca",
        "locatario": "Teresa Jiménez",
        "horario": "10:00 a 19:00 h",
        "telefono": "5500000323",
        "whatsapp": "5500000323",
        "inventario": [
          { "producto": "Blusa bordada", "precio": 450, "unidad": "pieza" },
          { "producto": "Rebozo", "precio": 380, "unidad": "pieza" }
        ]
      }
    ]
  }
}
