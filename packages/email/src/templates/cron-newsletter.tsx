import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export interface CronNewsletterSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface CronNewsletterContent {
  subject: string
  previewText: string
  intro: string
  sections: CronNewsletterSection[]
}

export function CronNewsletterTemplate({ content }: { content: CronNewsletterContent }) {
  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>{content.previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={eyebrow}>Lisbon Market Brief</Text>
          <Heading as="h1" style={heading}>
            {content.subject}
          </Heading>
          <Text style={intro}>{content.intro}</Text>
          {content.sections.map((section, index) => (
            <Section key={`${section.heading}-${index}`} style={index === 0 ? sectionFirst : sectionBlock}>
              <Heading as="h2" style={sectionHeading}>
                {section.heading}
              </Heading>
              {section.paragraphs?.map((paragraph, paragraphIndex) => (
                <Text key={`${section.heading}-p-${paragraphIndex}`} style={paragraphStyle}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.length ? (
                <ul style={bulletList}>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${section.heading}-b-${bulletIndex}`} style={bulletItem}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {index < content.sections.length - 1 ? <Hr style={divider} /> : null}
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f6f7f9',
  fontFamily: 'Arial, "Helvetica Neue", sans-serif',
  margin: '0',
  padding: '32px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #d8dde6',
  margin: '0 auto',
  maxWidth: '680px',
  padding: '32px',
}

const eyebrow = {
  color: '#596579',
  fontSize: '12px',
  letterSpacing: '0.08em',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const heading = {
  color: '#111827',
  fontSize: '28px',
  lineHeight: '1.25',
  margin: '0 0 16px',
}

const intro = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.7',
  margin: '0 0 28px',
}

const sectionFirst = {
  marginTop: '0',
}

const sectionBlock = {
  marginTop: '24px',
}

const sectionHeading = {
  color: '#1f2937',
  fontSize: '20px',
  lineHeight: '1.35',
  margin: '0 0 12px',
}

const paragraphStyle = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 10px',
}

const bulletList = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '8px 0 0 20px',
  padding: '0',
}

const bulletItem = {
  margin: '0 0 6px',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0 0',
}
