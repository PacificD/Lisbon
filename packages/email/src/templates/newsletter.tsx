import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { Theme } from '@lisbon/core'
import type { WorkflowResult } from '@lisbon/shared'

export interface NewsletterTemplateProps {
  theme: Theme
  result: WorkflowResult
}

export function NewsletterTemplate({ theme, result }: NewsletterTemplateProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{result.previewText}</Preview>
      <Body data-newsletter-theme={theme.slug} style={body}>
        <Container style={container}>
          <Text style={eyebrow}>{theme.name}</Text>
          <Heading as="h1" style={heading}>
            {result.subject}
          </Heading>
          <Text style={intro}>{result.intro}</Text>
          {result.items.map((item, index) => (
            <Section key={item.url} style={index === 0 ? itemSectionFirst : itemSection}>
              <Heading as="h2" style={itemHeading}>
                <Link href={item.url} style={itemLink}>
                  {item.title}
                </Link>
              </Heading>
              <Text style={meta}>
                {item.source}
                {item.author ? ` • ${item.author}` : ''}
                {item.publishedAt ? ` • ${item.publishedAt}` : ''}
              </Text>
              <Text style={summary}>{item.summary}</Text>
              {item.tags?.length ? <Text style={tags}>Tags: {item.tags.join(', ')}</Text> : null}
              <Link href={item.url} style={cta}>
                Read more
              </Link>
              <Hr style={divider} />
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f3efe6',
  fontFamily: 'Georgia, serif',
  margin: '0',
  padding: '32px 0',
}

const container = {
  backgroundColor: '#fffdf8',
  border: '1px solid #d7d1c3',
  margin: '0 auto',
  maxWidth: '640px',
  padding: '32px',
}

const eyebrow = {
  color: '#7f5a00',
  fontSize: '12px',
  letterSpacing: '0.12em',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const heading = {
  color: '#1f1a14',
  fontSize: '30px',
  lineHeight: '1.2',
  margin: '0 0 16px',
}

const intro = {
  color: '#40352a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const itemSectionFirst = {
  marginTop: '0',
}

const itemSection = {
  marginTop: '24px',
}

const itemHeading = {
  fontSize: '22px',
  lineHeight: '1.3',
  margin: '0 0 8px',
}

const itemLink = {
  color: '#0f5d73',
  textDecoration: 'none',
}

const meta = {
  color: '#6d6257',
  fontSize: '13px',
  margin: '0 0 12px',
}

const summary = {
  color: '#2c241d',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
}

const tags = {
  color: '#7f5a00',
  fontSize: '13px',
  margin: '0 0 12px',
}

const cta = {
  color: '#0f5d73',
  fontSize: '14px',
  textDecoration: 'underline',
}

const divider = {
  borderColor: '#e4ddcf',
  margin: '24px 0 0',
}
