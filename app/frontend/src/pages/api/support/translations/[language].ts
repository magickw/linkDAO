/**
 * API endpoint for document translations
 * Returns translated documents for a specific language
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface DocumentTranslation {
  language: string;
  title: string;
  description: string;
  content: string;
  translatedAt: string;
  translatedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'draft' | 'translated' | 'reviewed' | 'published';
}

// Mock translation data - in production, this would come from a database
const mockTranslations: Record<string, Record<string, DocumentTranslation>> = {
  es: {
    'beginners-guide': {
      language: 'es',
      title: 'Guía Completa para Principiantes',
      description: 'Todo lo que necesitas saber para comenzar con los tokens LDAO, desde la configuración de la billetera hasta tu primera compra.',
      content: `# Guía Completa para Principiantes

## Introducción

Bienvenido al mundo de los tokens LDAO. Esta guía te ayudará a comenzar desde cero.

## Configuración de Billetera

1. Descarga MetaMask desde el sitio web oficial
2. Crea una nueva billetera
3. Guarda tu frase de recuperación de forma segura
4. Conecta tu billetera a la red correcta

## Tu Primera Compra

1. Obtén algo de ETH para las tarifas de gas
2. Navega al mercado LDAO
3. Selecciona la cantidad que deseas comprar
4. Confirma la transacción

## Consejos de Seguridad

- Nunca compartas tu clave privada
- Siempre verifica las direcciones de los contratos
- Usa sitios web oficiales únicamente
- Mantén tu software actualizado

## Próximos Pasos

Una vez que tengas tokens LDAO, puedes:
- Participar en la gobernanza
- Hacer staking para obtener recompensas
- Comerciar en exchanges descentralizados
- Participar en actividades de la comunidad`,
      translatedAt: '2025-10-20T10:00:00Z',
      translatedBy: 'Maria Rodriguez',
      reviewedBy: 'Carlos Martinez',
      reviewedAt: '2025-10-21T14:30:00Z',
      status: 'published'
    },
    'security-guide': {
      language: 'es',
      title: 'Mejores Prácticas de Seguridad',
      description: 'Guía completa para mantener tus tokens LDAO y cuenta seguros contra estafas y amenazas.',
      content: `# Mejores Prácticas de Seguridad

## Seguridad de la Billetera

### Configuración Segura
- Usa billeteras de hardware para grandes cantidades
- Habilita la autenticación de dos factores
- Mantén tu software actualizado
- Usa contraseñas fuertes y únicas

### Protección de Claves Privadas
- Nunca compartas tu frase de recuperación
- Almacena las copias de seguridad de forma segura
- No tomes capturas de pantalla de las claves
- Usa almacenamiento offline para copias de seguridad

## Identificación de Estafas

### Señales de Alerta
- Ofertas demasiado buenas para ser verdad
- Solicitudes urgentes de información personal
- Enlaces sospechosos en mensajes
- Sitios web que imitan plataformas oficiales

### Tipos Comunes de Estafas
- Phishing por correo electrónico
- Sitios web falsos
- Esquemas Ponzi
- Estafas de soporte técnico falso

## Navegación Segura

### Verificación de Sitios Web
- Siempre verifica la URL
- Busca certificados SSL
- Usa marcadores para sitios oficiales
- Evita hacer clic en enlaces en correos

### Interacciones con Contratos Inteligentes
- Verifica las direcciones de los contratos
- Lee los términos cuidadosamente
- Usa herramientas de verificación
- Comienza con cantidades pequeñas`,
      translatedAt: '2025-10-20T11:00:00Z',
      translatedBy: 'Ana Garcia',
      reviewedBy: 'Luis Fernandez',
      reviewedAt: '2025-10-21T15:00:00Z',
      status: 'published'
    }
  },
  fr: {
    'beginners-guide': {
      language: 'fr',
      title: 'Guide Complet pour Débutants',
      description: 'Tout ce que vous devez savoir pour commencer avec les tokens LDAO, de la configuration du portefeuille à votre premier achat.',
      content: `# Guide Complet pour Débutants

## Introduction

Bienvenue dans le monde des tokens LDAO. Ce guide vous aidera à commencer à partir de zéro.

## Configuration du Portefeuille

1. Téléchargez MetaMask depuis le site officiel
2. Créez un nouveau portefeuille
3. Sauvegardez votre phrase de récupération en sécurité
4. Connectez votre portefeuille au bon réseau

## Votre Premier Achat

1. Obtenez de l'ETH pour les frais de gas
2. Naviguez vers le marché LDAO
3. Sélectionnez le montant que vous souhaitez acheter
4. Confirmez la transaction

## Conseils de Sécurité

- Ne partagez jamais votre clé privée
- Vérifiez toujours les adresses des contrats
- Utilisez uniquement les sites web officiels
- Maintenez votre logiciel à jour

## Prochaines Étapes

Une fois que vous avez des tokens LDAO, vous pouvez :
- Participer à la gouvernance
- Faire du staking pour des récompenses
- Trader sur des exchanges décentralisés
- Participer aux activités communautaires`,
      translatedAt: '2025-10-20T12:00:00Z',
      translatedBy: 'Pierre Dubois',
      reviewedBy: 'Marie Leroy',
      reviewedAt: '2025-10-21T16:00:00Z',
      status: 'published'
    }
  },
  de: {
    'beginners-guide': {
      language: 'de',
      title: 'Vollständiger Leitfaden für Anfänger',
      description: 'Alles was Sie wissen müssen, um mit LDAO-Token zu beginnen, von der Wallet-Einrichtung bis zu Ihrem ersten Kauf.',
      content: `# Vollständiger Leitfaden für Anfänger

## Einführung

Willkommen in der Welt der LDAO-Token. Dieser Leitfaden hilft Ihnen, von Grund auf zu beginnen.

## Wallet-Einrichtung

1. Laden Sie MetaMask von der offiziellen Website herunter
2. Erstellen Sie eine neue Wallet
3. Sichern Sie Ihre Wiederherstellungsphrase sicher
4. Verbinden Sie Ihre Wallet mit dem richtigen Netzwerk

## Ihr Erster Kauf

1. Besorgen Sie sich ETH für Gas-Gebühren
2. Navigieren Sie zum LDAO-Markt
3. Wählen Sie die Menge, die Sie kaufen möchten
4. Bestätigen Sie die Transaktion

## Sicherheitstipps

- Teilen Sie niemals Ihren privaten Schlüssel
- Überprüfen Sie immer Vertragsadressen
- Verwenden Sie nur offizielle Websites
- Halten Sie Ihre Software aktuell

## Nächste Schritte

Sobald Sie LDAO-Token haben, können Sie:
- An der Governance teilnehmen
- Staking für Belohnungen betreiben
- Auf dezentralen Börsen handeln
- An Community-Aktivitäten teilnehmen`,
      translatedAt: '2025-10-20T13:00:00Z',
      translatedBy: 'Hans Mueller',
      reviewedBy: 'Greta Schmidt',
      reviewedAt: '2025-10-21T17:00:00Z',
      status: 'published'
    }
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { language } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Language parameter is required' });
  }

  // Check if we have translations for this language
  const translations = mockTranslations[language];
  
  if (!translations) {
    return res.status(404).json({ error: 'No translations found for this language' });
  }

  // Return translations
  res.status(200).json(translations);
}