const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const XLSX = require("xlsx");

async function generateTestFiles() {
  const outputDir = path.join(__dirname, "..", "test_files_xlsx");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pool = new Pool({
    connectionString: "postgres://recupffe:recupffe_password@localhost:5433/recupffe",
  });

  // Récupération des vrais joueurs de Marseille-Échecs depuis PostgreSQL
  const res = await pool.query(
    "SELECT nr_ffe, nom, prenom, af FROM players ORDER BY RANDOM() LIMIT 1200;"
  );
  await pool.end();

  const realPlayers = res.rows;
  console.log(`Chargé ${realPlayers.length} joueurs réels depuis PostgreSQL.`);

  // Noms fictifs pour simuler des participants non licenciés (environ 15% du lot)
  const unlicensedNames = [
    { nom: "DUPUIS", prenom: "Marc" },
    { nom: "LEFEBVRE", prenom: "Camille" },
    { nom: "MOREAU", prenom: "Alexandre" },
    { nom: "FOURNIER", prenom: "Léa" },
    { nom: "GIRARD", prenom: "Antoine" },
    { nom: "ROUSSEAU", prenom: "Inès" },
    { nom: "VINCENT", prenom: "Hugo" },
    { nom: "MULLER", prenom: "Emma" },
    { nom: "MERCIER", prenom: "Lucas" },
    { nom: "BOYER", prenom: "Sarah" },
  ];

  const paiements = ["CB HelloAsso", "Virement Club", "Chèque", "Espèces sur place"];
  const tarifs = ["Tarif Adhérent (20€)", "Tarif Jeune (15€)", "Open Général (30€)"];

  const fileSizes = [50, 100, 500, 1000];

  for (const size of fileSizes) {
    const rows = [];
    const unlicensedCount = Math.max(2, Math.floor(size * 0.15)); // ~15% de non licenciés
    const licensedCount = size - unlicensedCount;

    // 1. Ajout de licenciés réels
    for (let i = 0; i < licensedCount; i++) {
      const player = realPlayers[i % realPlayers.length];
      rows.push({
        "Nom participant": player.nom,
        "Prénom participant": player.prenom,
        "Licence": player.nr_ffe,
        "Paiement": paiements[i % paiements.length],
        "Tarif": tarifs[i % tarifs.length],
      });
    }

    // 2. Ajout de non-licenciés (sans numéro de licence ou licence erronée)
    for (let i = 0; i < unlicensedCount; i++) {
      const dummy = unlicensedNames[i % unlicensedNames.length];
      rows.push({
        "Nom participant": dummy.nom,
        "Prénom participant": `${dummy.prenom} ${i + 1}`,
        "Licence": i % 2 === 0 ? "" : `Z99${String(i).padStart(3, "0")}`,
        "Paiement": paiements[(licensedCount + i) % paiements.length],
        "Tarif": tarifs[(licensedCount + i) % tarifs.length],
      });
    }

    // Mélange des lignes (Fisher-Yates)
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }

    // Création du classeur Excel
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscrits");

    worksheet["!cols"] = [
      { wch: 22 }, // Nom participant
      { wch: 22 }, // Prénom participant
      { wch: 14 }, // Licence
      { wch: 18 }, // Paiement
      { wch: 22 }, // Tarif
    ];

    const fileName = `test_batch_${size}_joueurs.xlsx`;
    const filePath = path.join(outputDir, fileName);
    XLSX.writeFile(workbook, filePath);

    const stats = fs.statSync(filePath);
    console.log(`✅ Généré : ${fileName} (${rows.length} lignes, ${(stats.size / 1024).toFixed(1)} Ko) -> ${filePath}`);
  }

  console.log("\nTous les fichiers de test sont prêts dans le dossier test_files_xlsx/ !");
}

generateTestFiles().catch(console.error);
